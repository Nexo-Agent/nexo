#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum WebviewLifecycle {
    Creating,
    Ready,
    Visible,
    Hidden,
    Destroying,
}

impl WebviewLifecycle {
    pub const fn is_alive(self) -> bool {
        !matches!(self, Self::Destroying)
    }
}
