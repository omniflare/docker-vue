import "./App.css";
import { useState } from "react";
import Containers from "./components/Containers";
import DockerImagesManager from "./components/ImageManager";
import NetworkManager from "./components/NetworkManager";
import VolumeManager from "./components/VolumeManager";
import { Boxes, HardDrive, Network, Container } from "lucide-react";

function App() {
  const [activeTab, setActiveTab] = useState("containers");

  const navigationItems = [
    {
      id: "containers",
      label: "Containers",
      icon: <Container className="w-5 h-5" />,
      component: <Containers />,
    },
    {
      id: "images",
      label: "Images",
      icon: <Boxes className="w-5 h-5" />,
      component: <DockerImagesManager />,
    },
    {
      id: "volumes",
      label: "Volumes",
      icon: <HardDrive className="w-5 h-5" />,
      component: <VolumeManager />,
    },
    {
      id: "networks",
      label: "Networks",
      icon: <Network className="w-5 h-5" />,
      component: <NetworkManager />,
    },
  ];

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      <div className="w-64 bg-gray-50 border-r border-gray-200">
        <div className="flex flex-col h-full">
          <div className="h-16 flex items-center px-6 border-b border-gray-200">
            <h1 className="text-xl font-semibold text-gray-800">
              DockerVue
            </h1>
          </div>
          <nav className="flex-1 px-4 py-4">
            {navigationItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center space-x-3 px-4 py-3 mb-2 rounded-lg transition-colors ${activeTab === item.id
                    ? "bg-blue-50 text-blue-600 p-5"
                    : "text-gray-600 hover:bg-gray-100"
                  }`}
              >
                <div className="flex items-center justify-center">
                  {item.icon}
                </div>
                <span className="font-medium">{item.label}</span>
              </button>
            ))}
          </nav>
          <div className="p-3 text-blue-800">
            <div>
              made by
              <a href="github.com/omniflare" className="text-red-600">{" "}@Omniflare</a>
            </div>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-8">
        {navigationItems.find((item) => item.id === activeTab)?.component}
      </div>
    </div>
  );
}

export default App;