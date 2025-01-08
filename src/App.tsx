import "./App.css";
import { useState } from "react";
import Containers from "./components/Containers";
import DockerImagesManager from "./components/ImageManager";
import NetworkManager from "./components/NetworkManager";
import VolumeManager from "./components/VolumeManager";
import { Boxes, HardDrive, Network, Container } from "lucide-react";

function App() {
  const [activeTab, setActiveTab] = useState("containers");
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);

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
      <div
        className={`transition-all duration-300 bg-gray-50 border-r border-gray-200 ${
          isSidebarHovered ? "w-64" : "w-16"
        }`}
        onMouseEnter={() => setIsSidebarHovered(true)}
        onMouseLeave={() => setIsSidebarHovered(false)}
      >
        <div className="flex flex-col h-full">
          <div
            className={`h-16 flex items-center px-6 border-b border-gray-200 ${
              isSidebarHovered ? "justify-start" : "justify-center"
            }`}
          >
            {isSidebarHovered && (
              <h1 className="text-xl font-semibold text-gray-800">
                Docker Manager
              </h1>
            )}
          </div>
          <nav className="flex-1 px-4 py-4">
            {navigationItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center space-x-3 px-4 py-3 mb-2 rounded-lg transition-colors ${
                  activeTab === item.id
                    ? "bg-blue-50 text-blue-600"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <div className="flex items-center justify-center">
                  {item.icon}
                </div>
                {isSidebarHovered && (
                  <span className="font-medium">{item.label}</span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-8">
        {navigationItems.find((item) => item.id === activeTab)?.component}
      </div>
    </div>
  );
}

export default App;
