from pydantic import BaseModel


class SystemStatus(BaseModel):
    app_name: str = "Novel Writer"
    version: str = "1.0.0"
    db_size: str = ""
    books_count: int = 0
    chapters_count: int = 0
    active_schedules: int = 0


class SystemSettings(BaseModel):
    default_output_folder: str = ""
    default_output_format: str = "md"