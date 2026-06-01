# backend/tests/test_dur_cross_record.py
# DUR 교차 진료기록 점검 로직 단위 테스트. DB 없이 합성 객체로만 검증한다.
# (gather_overlapping_prescriptions·_cross_contraindication 은 DB 쿼리라 여기서 제외 —
#  그쪽은 readonly 재현으로 확인.)

from datetime import date, timedelta

from app.services.dur_service import (
    DEFAULT_DURATION_DAYS,
    LEVEL_BLOCK,
    LEVEL_WARN,
    _DrugFacts,
    _Masters,
    _ResolvedDrug,
    _cross_concurrent_ingredient,
    _cross_dose_exceeded,
    _source_label,
    _sum_daily_by_ingredient,
    active_window,
    windows_overlap,
)


# 합성 객체 헬퍼
def _facts(drug_id, ingredients=(), item_seq=None, atc=None):
    return _DrugFacts(drug_id=drug_id, item_seq=item_seq, atc=atc, main_ingredients=frozenset(ingredients))


def _drug(name, drug_id, ingredients=(), daily_amount=None, unit=None):
    return _ResolvedDrug(name=name, facts=_facts(drug_id, ingredients), daily_amount=daily_amount, dose_unit=unit)


class _Rec:
    """active_window·_source_label 용 최소 record 스텁."""
    def __init__(self, visit_date=None, hospital_name=None, id=1):
        self.visit_date = visit_date
        self.hospital_name = hospital_name
        self.id = id


class _Presc:
    """active_window 용 최소 처방 스텁 (visit_date 속성 없음 — record 폴백 확인용)."""
    def __init__(self, start_date=None, end_date=None, duration_days=None):
        self.start_date = start_date
        self.end_date = end_date
        self.duration_days = duration_days


def _masters_with_unit_limits(by_unit):
    return _Masters(
        by_drug_id={}, item_seq_to_drug_id={}, recalled_drug_ids=frozenset(),
        ingredient_to_max_dose={}, ingredient_max_dose_by_unit=by_unit, elderly_codes=frozenset(),
    )


# windows_overlap
def test_windows_overlap_true():
    assert windows_overlap(date(2026, 5, 27), date(2026, 6, 2), date(2026, 5, 29), date(2026, 6, 3))


def test_windows_overlap_false():
    assert not windows_overlap(date(2011, 9, 28), date(2011, 10, 28), date(2026, 5, 27), date(2026, 6, 2))


def test_windows_overlap_none_is_not_overlap():
    assert not windows_overlap(None, None, date(2026, 5, 27), date(2026, 6, 2))


# active_window
def test_active_window_falls_back_to_visit_date_and_default_days():
    s, e = active_window(_Presc(), _Rec(visit_date=date(2026, 5, 27)))
    assert s == date(2026, 5, 27)
    assert e == date(2026, 5, 27) + timedelta(days=DEFAULT_DURATION_DAYS)


def test_active_window_uses_duration_days():
    s, e = active_window(_Presc(duration_days=7), _Rec(visit_date=date(2026, 5, 27)))
    assert e == date(2026, 6, 3)


def test_active_window_prefers_explicit_start_end():
    s, e = active_window(_Presc(start_date=date(2026, 1, 1), end_date=date(2026, 1, 10)), None)
    assert (s, e) == (date(2026, 1, 1), date(2026, 1, 10))


def test_active_window_none_when_no_start():
    assert active_window(_Presc(), None) == (None, None)


# _sum_daily_by_ingredient
def test_sum_daily_same_unit_adds_up():
    totals = _sum_daily_by_ingredient([_drug("A", 1, ["X"], 3, "정"), _drug("B", 2, ["X"], 2, "정")])
    assert totals["X"]["total"] == 5
    assert totals["X"]["unit"] == "정"
    assert not totals["X"]["mixed"]


def test_sum_daily_mixed_unit_marks_mixed():
    totals = _sum_daily_by_ingredient([_drug("A", 1, ["X"], 3, "정"), _drug("B", 2, ["X"], 500, "mg")])
    assert totals["X"]["mixed"]


# _cross_concurrent_ingredient
def test_cross_dup_same_ingredient_blocks_with_context():
    within = [_drug("타이레놀(내과)", 36802, ["M040353"])]
    cross = [(_drug("타이레놀(정형)", 36802, ["M040353"]), "바른뼈정형외과(5/29 진료)", _Rec(id=26))]
    alerts = _cross_concurrent_ingredient(within, cross)
    assert len(alerts) == 1
    assert alerts[0]["level"] == LEVEL_BLOCK
    assert "바른뼈정형외과(5/29 진료)" in alerts[0]["message"]


def test_cross_dup_different_ingredient_no_alert():
    within = [_drug("A", 1, ["X"])]
    cross = [(_drug("B", 2, ["Y"]), "라벨", _Rec(id=2))]
    assert _cross_concurrent_ingredient(within, cross) == []


def test_cross_dup_dedup_by_drug_and_record():
    within = [_drug("A", 1, ["X"]), _drug("A2", 1, ["X"])]   # 같은 drug_id 두 처방
    cross = [(_drug("C", 9, ["X"]), "라벨", _Rec(id=2))]
    assert len(_cross_concurrent_ingredient(within, cross)) == 1


# _cross_dose_exceeded
_LIMIT = {"M040353": {"정": {"max_dose": 50.0, "unit": "정", "name": "아세트아미노펜"}}}


def test_cross_dose_fires_when_combined_over_limit():
    masters = _masters_with_unit_limits(_LIMIT)
    within = [_drug("내과", 36802, ["M040353"], 30, "정")]
    cross = [(_drug("정형", 36802, ["M040353"], 30, "정"), "바른뼈정형외과(5/29 진료)", _Rec(id=26))]
    alerts = _cross_dose_exceeded(within, cross, masters)
    assert len(alerts) == 1
    assert alerts[0]["level"] == LEVEL_WARN
    assert "60정" in alerts[0]["message"]
    assert "50정" in alerts[0]["message"]


def test_cross_dose_silent_when_under_limit():
    masters = _masters_with_unit_limits(_LIMIT)
    within = [_drug("내과", 36802, ["M040353"], 20, "정")]
    cross = [(_drug("정형", 36802, ["M040353"], 20, "정"), "라벨", _Rec(id=26))]
    assert _cross_dose_exceeded(within, cross, masters) == []


def test_cross_dose_excluded_when_within_alone_already_over():
    masters = _masters_with_unit_limits(_LIMIT)
    within = [_drug("내과", 36802, ["M040353"], 60, "정")]   # within 단독 60 > 50
    cross = [(_drug("정형", 36802, ["M040353"], 30, "정"), "라벨", _Rec(id=26))]
    assert _cross_dose_exceeded(within, cross, masters) == []


# _source_label
def test_source_label_with_hospital_and_date():
    assert _source_label(_Rec(visit_date=date(2026, 5, 27), hospital_name="튼튼내과의원")) == "튼튼내과의원(5/27 진료)"


def test_source_label_fallback_when_missing():
    assert _source_label(_Rec(visit_date=None, hospital_name=None)) == "다른 진료기록"
