//! Broadcast cancellation helpers for LLM streaming.

use tokio::sync::broadcast;

/// Wait until a cancel signal is received on a broadcast receiver.
///
/// On a small-capacity channel, `RecvError::Lagged` means a cancel was sent
/// while the consumer was busy — treat it as cancelled.
pub async fn wait_for_broadcast_cancel(rx: &mut broadcast::Receiver<()>) {
    loop {
        match rx.recv().await {
            Ok(()) => return,
            Err(broadcast::error::RecvError::Lagged(_)) => return,
            Err(broadcast::error::RecvError::Closed) => {
                futures::future::pending::<()>().await;
            }
        }
    }
}
