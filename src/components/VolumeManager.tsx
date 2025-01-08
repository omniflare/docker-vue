import { useState, useEffect } from 'react';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Trash2, Plus, RefreshCw } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { invoke } from '@tauri-apps/api/core';

interface Volume {
    name: string;
    driver: string;
    mountpoint: string | null;
    labels: Record<string, string> | null;
    scope: string | null;
    status: Record<string, string> | null;
}

const VolumeManager = () => {
    const [volumes, setVolumes] = useState<Volume[]>([]);
    const [newVolumeName, setNewVolumeName] = useState('');
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    // console.log(volumes);

    const fetchVolumes = async () => {
        setIsLoading(true);
        try {
            const volumeList = await invoke('list_volumes');
            setVolumes(volumeList as Volume[]);
            // console.log("volume list: ",volumeList);
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error fetching volumes",
                description: error as string,
            });
        }
        setIsLoading(false);
    };

    useEffect(() => {
        fetchVolumes();
    }, []);

    const handleCreateVolume = async () => {
        if (!newVolumeName.trim()) {
            toast({
                variant: "destructive",
                title: "Invalid volume name",
                description: "Volume name cannot be empty",
            });
            return;
        }

        try {
            await invoke('create_volume', { volumeName: newVolumeName });
            toast({
                title: "Success",
                description: `Volume ${newVolumeName} created successfully`,
            });
            setNewVolumeName('');
            setIsCreateDialogOpen(false);
            fetchVolumes();
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error creating volume",
                description: error as string,
            });
        }
    };

    const handleRemoveVolume = async (volumeName: string) => {
        try {
            await invoke('remove_volume', { volumeName });
            toast({
                title: "Success",
                description: `Volume ${volumeName} removed successfully`,
            });
            fetchVolumes();
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error removing volume",
                description: error as string,
            });
        }
    };

    return (
        <Card className="w-full">
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Docker Volumes</CardTitle>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={fetchVolumes}
                        disabled={isLoading}
                    >
                        <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                    </Button>
                    <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="h-4 w-4 mr-2" />
                                Create Volume
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Create New Volume</DialogTitle>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="flex flex-col gap-2">
                                    <Input
                                        placeholder="Volume name"
                                        value={newVolumeName}
                                        onChange={(e) => setNewVolumeName(e.target.value)}
                                    />
                                </div>
                                <Button onClick={handleCreateVolume}>
                                    Create Volume
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
                            <TableHead>Mountpoint</TableHead>
                            <TableHead>Scope</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {volumes.map((volume) => (
                            <TableRow key={volume.name}>
                                <TableCell>{volume.name}</TableCell>
                                <TableCell>{volume.driver}</TableCell>
                                <TableCell>{volume.mountpoint || '-'}</TableCell>
                                <TableCell>{volume.scope || '-'}</TableCell>
                                <TableCell>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon">
                                                <Trash2 className="h-4 w-4 text-red-500" />
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Remove Volume</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    Are you sure you want to remove the volume "{volume.name}"?
                                                    This action cannot be undone.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction
                                                    onClick={() => handleRemoveVolume(volume.name)}
                                                >
                                                    Remove
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
};

export default VolumeManager;