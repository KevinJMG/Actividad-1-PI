import Chat from "./chat/Chat";
import Interaction from "./interaction/Interaction";

const Home: React.FC = () => {
  return (
    <div className="flex w-full h-screen">
      
      {/* Sección de video (ocupa 70%) */}
      <div className="flex-1 bg-black">
        <Interaction />
      </div>

      {/* Barra derecha: chat (30%) */}
      <div className="w-1/3 border-l border-gray-300 dark:border-gray-700">
        <Chat />
      </div>

    </div>
  );
};

export default Home;