# app/schemas/profile.py
from pydantic import BaseModel
from datetime import datetime


# 프로필 아이템 항목
class ProfileItemResponse(BaseModel):
    id: int
    name: str
    image_url: str
    required_point: int
    is_default: bool
    is_unlocked: bool
    is_selected: bool


# 프로필 아이템 목록 조회 응답
class ProfileItemListResponse(BaseModel):
    items: list[ProfileItemResponse]


# 프로필 선택 요청
class SelectProfileRequest(BaseModel):
    profile_item_id: int


# 프로필 선택 응답
class SelectProfileResponse(BaseModel):
    profile_item_id: int
    image_url: str
    message: str