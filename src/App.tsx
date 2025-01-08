import "./App.css";
import Containers from "./components/Containers";
import DockerImagesManager from "./components/ImageManager";
import NetworkManager from "./components/NetworkManager";
import VolumeManager from "./components/VolumeManager";
// import { Toast } from "./components/ui/toast";

function App() {
  

  return (
    <div className=" bg-white min-h-screen">
      {/* <List />
       */}

       {/* <Containers /> */}
        {/* <Toast /> */}

        {/* <DockerImagesManager /> */}
        {/* <VolumeManager /> */}
        <NetworkManager />
    </div>
  );
}

export default App;
