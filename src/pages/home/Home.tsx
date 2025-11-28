// Home.tsx
import Chat from "./chat/Chat";
import Interaction from "./interaction/Interaction";

const Home: React.FC = () => {
  return (
    <div className="flex w-full h-screen bg-gray-900 text-white overflow-hidden">

      {/* Zona de video */}
      <div className="flex flex-col flex-1 relative overflow-hidden">
        <Interaction />
      </div>

      {/* Chat lateral */}
      <div className="w-[28%] min-w-[300px] bg-gray-800 border-l border-gray-700 overflow-y-auto">
        <Chat />
      </div>

    </div>
  );
};

export default Home;
