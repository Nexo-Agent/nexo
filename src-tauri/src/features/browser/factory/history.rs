pub struct HistoryState {
    entries: Vec<String>,
    index: usize,
}

impl HistoryState {
    pub fn new(initial: String) -> Self {
        Self {
            entries: vec![initial],
            index: 0,
        }
    }

    pub fn push(&mut self, url: String) {
        if self.entries.get(self.index) == Some(&url) {
            return;
        }
        self.entries.truncate(self.index + 1);
        self.entries.push(url);
        self.index = self.entries.len().saturating_sub(1);
    }

    pub const fn can_go_back(&self) -> bool {
        self.index > 0
    }

    pub const fn can_go_forward(&self) -> bool {
        self.index + 1 < self.entries.len()
    }

    pub fn go_back(&mut self) -> Option<String> {
        if !self.can_go_back() {
            return None;
        }
        self.index -= 1;
        self.entries.get(self.index).cloned()
    }

    pub fn go_forward(&mut self) -> Option<String> {
        if !self.can_go_forward() {
            return None;
        }
        self.index += 1;
        self.entries.get(self.index).cloned()
    }
}
