use super::models::Note;
use super::repository::NoteRepository;
use crate::error::AppError;
use std::sync::Arc;

pub struct NoteService {
    repository: Arc<dyn NoteRepository>,
}

impl NoteService {
    pub const fn new(repository: Arc<dyn NoteRepository>) -> Self {
        Self { repository }
    }

    pub fn create_note(&self, note: Note) -> Result<(), AppError> {
        self.repository.create(&note)
    }

    pub fn get_notes(&self) -> Result<Vec<Note>, AppError> {
        self.repository.get_all()
    }

    pub fn update_note(
        &self,
        id: String,
        title: String,
        content: String,
        updated_at: i64,
    ) -> Result<(), AppError> {
        self.repository.update(&id, &title, &content, updated_at)
    }

    pub fn delete_note(&self, id: String) -> Result<(), AppError> {
        self.repository.delete(&id)
    }
}
