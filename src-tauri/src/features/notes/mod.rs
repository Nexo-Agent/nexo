pub mod commands;
pub mod models;
pub mod repository;
pub mod service;

use std::sync::Arc;

pub struct NoteFeature {
    pub service: Arc<service::NoteService>,
}

impl NoteFeature {
    pub const fn new(service: Arc<service::NoteService>) -> Self {
        Self { service }
    }
}
