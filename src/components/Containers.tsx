import { Badge } from "@/components/ui/badge";
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { toast } from "@/hooks/use-toast";
import { invoke } from "@tauri-apps/api/core";
import { Pause, Play, Plus, RefreshCwOff, Square, Terminal, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Input } from "./ui/input";
import { Label } from "./ui/label";

interface Container {
    name: string | null;
    status: string | null;
    state: string | null;
    ports: string[] | null;
}

const Containers = () => {
    const [containers, setContainers] = useState<Container[]>([]);
    const [images, setImages] = useState<{ repo_tag: string; size: number }[]>([]);
    const [selectedImage, setSelectedImage] = useState<string>('');
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isLogsDialogOpen, setIsLogsDialogOpen] = useState(false);
    const [selectedContainer, setSelectedContainer] = useState<string>('');
    const [portMapping, setPortMapping] = useState<string>('');
    const [logs, setLogs] = useState<string[]>([]);


    const validatePortMapping = (portMapping: string): boolean => {
        if (!portMapping) return true; // Empty is valid (optional)

        const pattern = /^\d+:\d+$/;
        if (!pattern.test(portMapping)) return false;

        const [hostPort, containerPort] = portMapping.split(':').map(Number);

        // Valid port range is 1-65535
        if (hostPort < 1 || hostPort > 65535) return false;
        if (containerPort < 1 || containerPort > 65535) return false;

        return true;
    };


    const fetchContainers = async () => {
        try {
            const containersList = await invoke<Container[]>('list_containers');
            console.log(containersList);
            setContainers(containersList);
        } catch (error) {
            toast({
                title: "Error",
                description: `Failed to fetch containers: ${error}`,
                variant: "destructive"
            });
        }
    };

    const fetchImages = async () => {
        try {
            const imagesList = await invoke<{ repo_tag: string; size: number }[]>('list_images');
            setImages(imagesList);
        } catch (error) {
            toast({
                title: "Error",
                description: `Failed to fetch images: ${error}`,
                variant: "destructive"
            });
        }
    };

    useEffect(() => {
        fetchContainers();
        fetchImages();

        const interval = setInterval(fetchContainers, 5000); // Refresh every 5 seconds
        return () => clearInterval(interval);
    }, []);

    const handleCreateContainer = async () => {
        if (!selectedImage) {
            toast({
                title: "Error",
                description: "Please select an image",
                variant: "destructive"
            });
            return;
        }

        if (portMapping && !validatePortMapping(portMapping)) {
            toast({
                title: "Error",
                description: "Invalid port mapping format. Use format: hostPort:containerPort (e.g., 8080:80)",
                variant: "destructive"
            });
            return;
        }

        try {
            await invoke('create_container', {
                image: selectedImage,
                portMapping: portMapping ? portMapping : null
            });

            toast({
                title: "Success",
                description: "Container created successfully"
            });
            setIsCreateDialogOpen(false);
            setPortMapping('');
            setSelectedImage('');
            fetchContainers();
        } catch (error) {
            toast({
                title: "Error",
                description: `Failed to create container: ${error}`,
                variant: "destructive"
            });
        }
    };

    const handleContainerAction = async (action: string, containerName: string) => {
        try {
            await invoke(action, { containerName });
            toast({
                title: "Success",
                description: `Container ${action} successful`
            });
            
            fetchContainers();
        } catch (error) {
            console.log("error : " , error);
            toast({
                title: "Error",
                description: `Failed to ${action} container: ${error}`,
                variant: "destructive"
            });
        }
    };


    const handleViewLogs = async (containerName: string) => {
        setSelectedContainer(containerName);
        setIsLogsDialogOpen(true);
        setLogs([]);

        try {
            await invoke('emit_logs', {
                containerName,
                onEvent: (log: string) => {
                    setLogs(prev => [...prev, log]);
                }
            });
        } catch (error) {
            toast({
                title: "Error",
                description: `Failed to fetch logs: ${error}`,
                variant: "destructive"
            });
        }
    };
    const getStateColor = (state: string | null) => {
        switch (state?.toLowerCase()) {
            case 'running':
                return 'bg-green-100 text-green-700 border-green-200';
            case 'exited':
                return 'bg-red-100 text-red-700 border-red-200';
            case 'paused':
                return 'bg-yellow-100 text-yellow-700 border-yellow-200';
            default:
                return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    return (
        <div className="p-6">
            <Card className="border shadow-sm">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-2xl font-bold">Container Management</CardTitle>
                            <CardDescription>
                                Manage your Docker containers
                            </CardDescription>
                        </div>
                        <Button
                            onClick={() => setIsCreateDialogOpen(true)}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            Create Container
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>State</TableHead>
                                <TableHead>Ports</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {containers.map((container, index) => (
                                <TableRow key={index}>
                                    <TableCell className="font-medium">{container.name || 'N/A'}</TableCell>
                                    <TableCell>{container.status || 'N/A'}</TableCell>
                                    <TableCell>
                                        <Badge variant="secondary" className={getStateColor(container.state)}>
                                            {container.state || 'N/A'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{container.ports?.join(', ') || 'N/A'}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            {/* Start/Stop Button */}
                                            <div className="relative group">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    disabled={container.state == "paused"}
                                                    onClick={() =>
                                                        handleContainerAction(
                                                            container.state === "running" ? "stop_container" : "start_container",
                                                            container.name!
                                                        )
                                                    }
                                                    className={`hover:${container.state === "running" ? "bg-yellow-50 text-yellow-600" : "bg-green-50 text-green-600"}`}
                                                >
                                                    {container.state === "running" ? (
                                                        <Square className="h-4 w-4" />
                                                    ) : (<Play className="h-4 w-4" />)}
                                                </Button>
                                                <div className="absolute bottom-full mb-1 hidden rounded bg-gray-800 px-2 py-1 text-xs text-white group-hover:block">
                                                    {container.state === "running" ? "Stop Container" : "Start Container"}
                                                </div>
                                            </div>

                                            {/* Pause/Resume Button */}
                                            <div className="relative group">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() =>
                                                        handleContainerAction(
                                                            container.state === "paused" ? "unpause_container" : "pause_container",
                                                            container.name!
                                                        )
                                                    }
                                                    disabled={container.state !== "running" && container.state !== "paused"}
                                                    className={`hover:${container.state === "paused" ? "bg-green-50 text-green-600" : "bg-blue-50 text-blue-600"}`}
                                                >
                                                    {container.state === "paused" ? (
                                                        <Play className="h-4 w-4" />
                                                    ) : (
                                                        <Pause className="h-4 w-4" />
                                                    )}
                                                </Button>
                                                <div className="absolute bottom-full mb-1 hidden rounded bg-gray-800 px-2 py-1 text-xs text-white group-hover:block">
                                                    {container.state === "paused" ? "Resume Container" : "Pause Container"}
                                                </div>
                                            </div>

                                            {/* Kill Container */}
                                            <div className="relative group">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleContainerAction("kill_container", container.name!)}
                                                    disabled={container.state !== "running"}
                                                    className="hover:bg-red-50 hover:text-red-600"
                                                >
                                                    <RefreshCwOff className="h-4 w-4" />
                                                </Button>
                                                <div className="absolute bottom-full mb-1 hidden rounded bg-gray-800 px-2 py-1 text-xs text-white group-hover:block">
                                                    Kill Container
                                                </div>
                                            </div>

                                            {/* View Logs */}
                                            <div className="relative group">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleViewLogs(container.name!)}
                                                    className="hover:bg-purple-50 hover:text-purple-600"
                                                >
                                                    <Terminal className="h-4 w-4" />
                                                </Button>
                                                <div className="absolute bottom-full mb-1 hidden rounded bg-gray-800 px-2 py-1 text-xs text-white group-hover:block">
                                                    View Logs
                                                </div>
                                            </div>

                                            {/* Delete Container */}
                                            <div className="relative group">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleContainerAction("delete_container", container.name!)}
                                                    disabled={container.state === "running"}
                                                    className="hover:bg-red-50 hover:text-red-600"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                                <div className="absolute bottom-full mb-1 hidden rounded bg-gray-800 px-2 py-1 text-xs text-white group-hover:block">
                                                    Delete Container
                                                </div>
                                            </div>
                                        </div>

                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Create New Container</DialogTitle>
                        <DialogDescription>
                            Select a Docker image and configure port mapping (optional)
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="image">Docker Image</Label>
                            <Select
                                value={selectedImage}
                                onValueChange={setSelectedImage}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select an image" />
                                </SelectTrigger>
                                <SelectContent>
                                    {images.map((image) => (
                                        <SelectItem
                                            key={image.repo_tag}
                                            value={image.repo_tag || "unknown"}
                                        >
                                            {image.repo_tag || "Unnamed Image"}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="ports">
                                Port Mapping (optional)
                                <span className="text-sm text-gray-500 block">
                                    Format: host_port:container_port (e.g., 8080:80)
                                </span>
                            </Label>
                            <Input
                                id="ports"
                                placeholder="8080:80"
                                value={portMapping}
                                onChange={(e) => setPortMapping(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setIsCreateDialogOpen(false);
                                setPortMapping('');
                                setSelectedImage('');
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleCreateContainer}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            Create Container
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isLogsDialogOpen} onOpenChange={setIsLogsDialogOpen}>
                <DialogContent className="sm:max-w-4xl max-h-[80vh]">
                    <DialogHeader>
                        <DialogTitle>Container Logs: {selectedContainer}</DialogTitle>
                    </DialogHeader>
                    <ScrollArea className="h-[60vh] w-full rounded-md border">
                        <div className="p-4 font-mono bg-gray-50">
                            {logs.map((log, index) => (
                                <div key={index} className="whitespace-pre-wrap text-gray-800">
                                    {log}
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                </DialogContent>
            </Dialog>
            
        </div>
    );
};

export default Containers;