import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
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
import { invoke } from '@tauri-apps/api/core';
import { Link, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface Network {
    id: string;
    name: string;
    driver: string;
    scope: string;
    internal: boolean | null;
    enable_ipv6: boolean | null;
    labels: Record<string, string> | null;
}

interface Container {
    name: string | null;
    status: string | null;
    state: string | null;
    ports: string[] | null;
}

interface NetworkContainer {
    id: string;
    name: string;
    network_id: string;
}

const NetworkManager = () => {
    const [networks, setNetworks] = useState<Network[]>([]);
    const [containers, setContainers] = useState<Container[]>([]);
    const [selectedContainer, setSelectedContainer] = useState<string>('');
    const [selectedNetwork, setSelectedNetwork] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isConnectDialogOpen, setIsConnectDialogOpen] = useState(false);
    const [newNetworkName, setNewNetworkName] = useState('');
    const [newNetworkDriver, setNewNetworkDriver] = useState('bridge');
    const [selectedNetworkForContainers, setSelectedNetworkForContainers] = useState<Network | null>(null);
    const [networkContainers, setNetworkContainers] = useState<NetworkContainer[]>([]);
    const [isNetworkContainersDialogOpen, setIsNetworkContainersDialogOpen] = useState(false);

    const fetchNetworkContainers = async (networkId: string) => {
        try {
            const containers = await invoke('list_network_containers', { network_name: networkId });
            setNetworkContainers(containers as NetworkContainer[]);
        } catch (error) {
            toast.error('Error fetching network containers', {
                description: "some error occured"
            });
            console.log(error)
        }
    };

    const handleNetworkClick = async (event: React.MouseEvent, network: Network) => {
        event.preventDefault();
        event.stopPropagation();

        setSelectedNetworkForContainers(network);
        setIsNetworkContainersDialogOpen(true);
        await fetchNetworkContainers(network.id);
    };

    const fetchNetworks = async () => {
        setIsLoading(true);
        try {
            const networkList = await invoke('list_networks');
            setNetworks(networkList as Network[]);
            console.log(networkList)

            const testing = await invoke('list_network_containers', { networkName: "new_something" });
            console.log("testing : ", testing);
        } catch (error) {
            toast.error('Error fetching networks', {
                description: "some error occured"
            });
            console.log(error)
        }
        setIsLoading(false);
    };

    const fetchContainers = async () => {
        try {
            const containerList = await invoke('list_containers');
            setContainers(containerList as Container[]);
        } catch (error) {



            toast.error('Error fetching containers', {
                description: "some error occured"
            });
            console.log(error)
        }
    };

    useEffect(() => {
        fetchNetworks();
        fetchContainers();
    }, []);

    const handleCreateNetwork = async () => {
        if (!newNetworkName.trim()) {
            toast.error('Invalid network name', {
                description: 'Network name cannot be empty'
            });
            return;
        }

        try {
            await invoke('create_network', {
                name: newNetworkName,
                driver: newNetworkDriver
            });
            toast.success('Network created', {
                description: `Network ${newNetworkName} created successfully`
            });
            setNewNetworkName('');
            setIsCreateDialogOpen(false);
            fetchNetworks();
        } catch (error) {



            toast.error('Error creating network', {
                description: "some error occured"
            });
            console.log(error)
        }
    };

    const handleRemoveNetwork = async (networkId: string) => {
        try {
            await invoke('remove_network', { networkId });
            toast.success('Network removed', {
                description: 'Network removed successfully'
            });
            fetchNetworks();
        } catch (error) {



            toast.error('Error removing network', {
                description: "some error occured"
            });
            console.log(error)
        }
    };

    const handleConnectContainer = async () => {
        if (!selectedContainer || !selectedNetwork) {
            toast.error('Invalid selection', {
                description: 'Please select both a container and a network'
            });
            return;
        }

        try {
            await invoke('connect_container_to_network', {
                containerId: selectedContainer,
                networkId: selectedNetwork
            });
            toast.success('Container connected', {
                description: 'Container connected to network successfully'
            });
            setIsConnectDialogOpen(false);
            setSelectedContainer('');
            setSelectedNetwork('');
        } catch (error) {



            toast.error('Error connecting container', {
                description: "some error occured"
            });
            console.log(error)
        }
    };

    const handleDisconnectContainer = async (networkId: string, containerId: string) => {
        try {
            await invoke('disconnect_container_from_network', {
                containerId,
                networkId
            });
            toast.success('Container disconnected', {
                description: 'Container disconnected from network successfully'
            });
            fetchNetworks();
        } catch (error) {



            toast.error('Error disconnecting container', {
                description: "some error occured"
            });
            console.log(error);
        }
    };

    return (
        <Card className="w-full">
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Docker Networks</CardTitle>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={fetchNetworks}
                        disabled={isLoading}
                    >
                        <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                    </Button>

                    <Dialog open={isConnectDialogOpen} onOpenChange={setIsConnectDialogOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline">
                                <Link className="h-4 w-4 mr-2" />
                                Connect Container
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Connect Container to Network</DialogTitle>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <Select onValueChange={setSelectedContainer}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select container" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {containers.map((container) => (
                                            <SelectItem
                                                key={container.name}
                                                value={container.name || ''}
                                            >
                                                {container.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                <Select onValueChange={setSelectedNetwork}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select network" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {networks.map((network) => (
                                            <SelectItem
                                                key={network.id}
                                                value={network.id}
                                            >
                                                {network.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                <Button onClick={handleConnectContainer}>
                                    Connect
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>

                    <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="h-4 w-4 mr-2" />
                                Create Network
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Create New Network</DialogTitle>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <Input
                                    placeholder="Network name"
                                    value={newNetworkName}
                                    onChange={(e) => setNewNetworkName(e.target.value)}
                                />
                                <Select
                                    defaultValue={newNetworkDriver}
                                    onValueChange={setNewNetworkDriver}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select driver" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="bridge">Bridge</SelectItem>
                                        <SelectItem value="host">Host</SelectItem>
                                        <SelectItem value="overlay">Overlay</SelectItem>
                                        <SelectItem value="macvlan">Macvlan</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Button onClick={handleCreateNetwork}>
                                    Create Network
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Driver</TableHead>
                            <TableHead>Scope</TableHead>
                            <TableHead>IPv6</TableHead>
                            <TableHead>Internal</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {networks.map((network) => (
                            <TableRow
                                key={network.id}
                                className="cursor-pointer hover:bg-gray-50"
                                onClick={(e) => handleNetworkClick(e, network)}
                            >
                                <TableCell>{network.name}</TableCell>
                                <TableCell>{network.driver}</TableCell>
                                <TableCell>{network.scope}</TableCell>
                                <TableCell>{network.enable_ipv6 ? 'Yes' : 'No'}</TableCell>
                                <TableCell>{network.internal ? 'Yes' : 'No'}</TableCell>
                                <TableCell onClick={(e) => e.stopPropagation()}>
                                    <div className="flex gap-2">
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="icon">
                                                    <Trash2 className="h-4 w-4 text-red-500" />
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Remove Network</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        Are you sure you want to remove the network "{network.name}"?
                                                        This will disconnect all containers connected to this network.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction
                                                        onClick={() => handleRemoveNetwork(network.id)}
                                                    >
                                                        Remove
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>

                <Dialog
                    open={isNetworkContainersDialogOpen}
                    onOpenChange={setIsNetworkContainersDialogOpen}
                >
                    <DialogContent className="max-w-3xl">
                        <DialogHeader>
                            <DialogTitle>
                                Containers in Network: {selectedNetworkForContainers?.name}
                            </DialogTitle>
                        </DialogHeader>
                        <div className="mt-4">
                            <div className="flex justify-between mb-4">
                                <h3 className="text-lg font-semibold">Connected Containers</h3>
                                <Button
                                    variant="outline"
                                    onClick={() => setIsConnectDialogOpen(true)}
                                >
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Container
                                </Button>
                            </div>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Container Name</TableHead>
                                        <TableHead className="w-24">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {networkContainers.map((container) => (
                                        <TableRow key={container.id}>
                                            <TableCell>{container.name}</TableCell>
                                            <TableCell>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleDisconnectContainer(
                                                        selectedNetworkForContainers?.id || '',
                                                        container.id
                                                    )}
                                                >
                                                    <Trash2 className="h-4 w-4 text-red-500" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </DialogContent>
                </Dialog>
            </CardContent>
        </Card>
    );
};

export default NetworkManager;