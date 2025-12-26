import { ConnectionsProvider } from "@/contexts/ConnectionsContext";
import { Chat } from "@/components/Chat";

function App() {
  return (
    <ConnectionsProvider>
      <Chat />
    </ConnectionsProvider>
  );
}

export default App;
