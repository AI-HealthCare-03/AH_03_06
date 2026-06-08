# app/services/profile_service.py
from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.models.profile import ProfileItem, UserProfileItem
from app.schemas.profile import ProfileItemListResponse, ProfileItemResponse, SelectProfileResponse
from app.services import point_service


def get_profile_items(user_id: int, db: Session) -> ProfileItemListResponse:
    """전체 프로필 목록 조회 — 해금 여부 및 선택 여부 포함."""
    items = db.query(ProfileItem).order_by(ProfileItem.id).all()
    user_items = db.query(UserProfileItem).filter(
        UserProfileItem.user_id == user_id
    ).all()

    unlocked_ids = {ui.profile_item_id for ui in user_items}
    selected_ids = {ui.profile_item_id for ui in user_items if ui.is_selected}

    return ProfileItemListResponse(
        items=[
            ProfileItemResponse(
                id=item.id,
                name=item.name,
                image_url=item.image_url,
                required_point=item.required_point,
                is_default=item.is_default,
                is_unlocked=item.id in unlocked_ids or item.is_default,
                is_selected=item.id in selected_ids,
            )
            for item in items
        ]
    )


def unlock_profile_item(user_id: int, profile_item_id: int, db: Session) -> SelectProfileResponse:
    """포인트로 프로필 해금."""
    item = db.query(ProfileItem).filter(ProfileItem.id == profile_item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="profile_item_not_found")

    # 이미 해금 여부 확인
    existing = db.query(UserProfileItem).filter(
        UserProfileItem.user_id == user_id,
        UserProfileItem.profile_item_id == profile_item_id,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="already_unlocked")

    # 포인트 확인
    user_point = point_service._get_or_create_point(user_id, db)
    if user_point.balance < item.required_point:
        raise HTTPException(status_code=400, detail="insufficient_point")

    # 포인트 차감
    user_point.balance -= item.required_point
    from app.models.point import PointHistory
    db.add(PointHistory(
        user_id=user_id,
        event_type="profile_unlock",
        amount=-item.required_point,
        balance_snapshot=user_point.balance,
        description=f"프로필 해금: {item.name}",
    ))

    # 해금 기록 저장
    db.add(UserProfileItem(
        user_id=user_id,
        profile_item_id=profile_item_id,
        is_selected=False,
    ))
    db.commit()

    return SelectProfileResponse(
        profile_item_id=item.id,
        image_url=item.image_url,
        message="해금 완료",
    )


def select_profile_item(user_id: int, profile_item_id: int, db: Session) -> SelectProfileResponse:
    """프로필 선택 — 기존 선택 해제 후 새 프로필 선택."""
    item = db.query(ProfileItem).filter(ProfileItem.id == profile_item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="profile_item_not_found")

    # 해금 여부 확인 (기본 아이템은 해금 불필요)
    if not item.is_default:
        unlocked = db.query(UserProfileItem).filter(
            UserProfileItem.user_id == user_id,
            UserProfileItem.profile_item_id == profile_item_id,
        ).first()
        if not unlocked:
            raise HTTPException(status_code=400, detail="not_unlocked")

    # 기존 선택 전부 해제
    db.query(UserProfileItem).filter(
        UserProfileItem.user_id == user_id,
        UserProfileItem.is_selected == True,
    ).update({"is_selected": False})

    # 새 프로필 선택
    user_item = db.query(UserProfileItem).filter(
        UserProfileItem.user_id == user_id,
        UserProfileItem.profile_item_id == profile_item_id,
    ).first()

    if user_item:
        user_item.is_selected = True
    else:
        # 기본 아이템은 UserProfileItem 없이도 선택 가능
        db.add(UserProfileItem(
            user_id=user_id,
            profile_item_id=profile_item_id,
            is_selected=True,
        ))

    db.commit()

    return SelectProfileResponse(
        profile_item_id=item.id,
        image_url=item.image_url,
        message="프로필 선택 완료",
    )