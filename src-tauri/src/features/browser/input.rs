use crate::features::browser::models::BrowserInputEvent;
use chromiumoxide::cdp::browser_protocol::input::{
    DispatchKeyEventParams, DispatchKeyEventType, DispatchMouseEventParams, DispatchMouseEventType,
    InsertTextParams, MouseButton,
};

fn button_bitmask(button: &str) -> i64 {
    match button {
        "right" => 2,
        "middle" => 4,
        _ => 1,
    }
}

pub fn map_input_event(event: &BrowserInputEvent) -> Vec<CdpInputCommand> {
    match event {
        BrowserInputEvent::MousePressed {
            x,
            y,
            button,
            click_count,
        } => vec![CdpInputCommand::Mouse(
            DispatchMouseEventParams::builder()
                .r#type(DispatchMouseEventType::MousePressed)
                .x(*x)
                .y(*y)
                .button(parse_button(button))
                .buttons(button_bitmask(button))
                .click_count(*click_count as i64)
                .build()
                .expect("mouse pressed params"),
        )],
        BrowserInputEvent::MouseReleased {
            x,
            y,
            button,
            click_count,
        } => vec![CdpInputCommand::Mouse(
            DispatchMouseEventParams::builder()
                .r#type(DispatchMouseEventType::MouseReleased)
                .x(*x)
                .y(*y)
                .button(parse_button(button))
                .buttons(0)
                .click_count(*click_count as i64)
                .build()
                .expect("mouse released params"),
        )],
        BrowserInputEvent::MouseMoved { x, y } => vec![CdpInputCommand::Mouse(
            DispatchMouseEventParams::builder()
                .r#type(DispatchMouseEventType::MouseMoved)
                .x(*x)
                .y(*y)
                .buttons(1)
                .build()
                .expect("mouse moved params"),
        )],
        BrowserInputEvent::MouseWheel {
            x,
            y,
            delta_x,
            delta_y,
        } => vec![CdpInputCommand::Mouse(
            DispatchMouseEventParams::builder()
                .r#type(DispatchMouseEventType::MouseWheel)
                .x(*x)
                .y(*y)
                .delta_x(*delta_x)
                .delta_y(*delta_y)
                .build()
                .expect("mouse wheel params"),
        )],
        BrowserInputEvent::KeyDown { key, code } => {
            let text = printable_key_text(key);
            let mut builder = DispatchKeyEventParams::builder()
                .r#type(DispatchKeyEventType::KeyDown)
                .key(key.clone())
                .code(code.clone());
            if let Some(t) = text {
                builder = builder.text(t).unmodified_text(key.clone());
            }
            vec![CdpInputCommand::Key(builder.build().expect("key down params"))]
        }
        BrowserInputEvent::KeyUp { key, code } => vec![CdpInputCommand::Key(
            DispatchKeyEventParams::builder()
                .r#type(DispatchKeyEventType::KeyUp)
                .key(key.clone())
                .code(code.clone())
                .build()
                .expect("key up params"),
        )],
        BrowserInputEvent::InsertText { text } => {
            vec![CdpInputCommand::Text(InsertTextParams::new(text.clone()))]
        }
    }
}

pub enum CdpInputCommand {
    Mouse(DispatchMouseEventParams),
    Key(DispatchKeyEventParams),
    Text(InsertTextParams),
}

fn parse_button(button: &str) -> MouseButton {
    match button {
        "right" => MouseButton::Right,
        "middle" => MouseButton::Middle,
        _ => MouseButton::Left,
    }
}

fn printable_key_text(key: &str) -> Option<String> {
    if key.len() == 1 {
        return Some(key.to_string());
    }
    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn maps_mouse_press() {
        let cmds = map_input_event(&BrowserInputEvent::MousePressed {
            x: 10.0,
            y: 20.0,
            button: "left".to_string(),
            click_count: 1,
        });
        assert_eq!(cmds.len(), 1);
    }

    #[test]
    fn mouse_press_sets_buttons_bitmask() {
        let cmds = map_input_event(&BrowserInputEvent::MousePressed {
            x: 0.0,
            y: 0.0,
            button: "left".to_string(),
            click_count: 1,
        });
        let CdpInputCommand::Mouse(params) = &cmds[0] else {
            panic!("expected mouse command");
        };
        assert_eq!(params.buttons, Some(1));
    }

    #[test]
    fn key_down_sets_text_for_printable_keys() {
        let cmds = map_input_event(&BrowserInputEvent::KeyDown {
            key: "a".to_string(),
            code: "KeyA".to_string(),
        });
        let CdpInputCommand::Key(params) = &cmds[0] else {
            panic!("expected key command");
        };
        assert_eq!(params.text.as_deref(), Some("a"));
    }
}
