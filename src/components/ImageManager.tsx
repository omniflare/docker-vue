import { useState, useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { Trash2, RefreshCw, AlertCircle, Download } from 'lucide-react';
import {
    Card,
    CardContent,
    CardDescription,
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
import { Button } from '@/components/ui/button';
import {
    Alert,
    AlertDescription,
    AlertTitle,
} from '@/components/ui/alert';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { invoke } from '@tauri-apps/api/core';

interface Image {
    repo_tag: string;
    size: number;
}

interface ProgressInfo {
    status: string;
    progress_detail?: {
        current?: number;
        total?: number;
    };
    id?: string;
}

const DockerImagesManager = () => {
    const [images, setImages] = useState<Image[]>([]);
    const [error, setError] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [pullDialogOpen, setPullDialogOpen] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string>('');
    const [newImageName, setNewImageName] = useState<string>('');
    const [pullProgress, setPullProgress] = useState<{ [key: string]: number }>({});
    const [isPulling, setIsPulling] = useState(false);
    const [pullStatus, setPullStatus] = useState<string>('');

    const fetchImages = async () => {
        try {
            setLoading(true);
            const imagesList = await invoke<Image[]>('list_images');
            setImages(imagesList);
            setError('');
        } catch (err) {
            setError('Failed to fetch images: ' + err);
        } finally {
            setLoading(false);
        }
    };

    const handlePullImage = async () => {
        if (!newImageName) return;

        try {
            setIsPulling(true);
            setPullProgress({});
            setPullStatus('Starting download...');

            // Set up event listener
            const unlisten = await listen<ProgressInfo>('pull-progress', (event) => {
                const { payload } = event;

                if (payload.status) {
                    setPullStatus(payload.status);
                }

                if (payload.progress_detail && payload.id) {
                    const { current, total } = payload.progress_detail;
                    if (current && total) {
                        setPullProgress(prev => ({
                            ...prev,
                            [payload.id as string]: (current / total) * 100
                        }));
                    }
                }
            });
            await invoke('pull_image', { imageName: newImageName });

            unlisten();
            await fetchImages();
            setPullDialogOpen(false);
            setNewImageName('');

        } catch (err) {
            setError('Failed to pull image: ' + err);
        } finally {
            setIsPulling(false);
        }
    };

    const handleDeleteImage = async (repoTag: string) => {
        try {
            await invoke('remove_image', { image: repoTag });
            await fetchImages();
            setDeleteDialogOpen(false);
        } catch (err) {
            setError('Failed to delete image: ' + err);
        }
    };

    const formatSize = (size: number) => {
        const units = ['B', 'KB', 'MB', 'GB'];
        let formattedSize = size;
        let unitIndex = 0;

        while (formattedSize >= 1024 && unitIndex < units.length - 1) {
            formattedSize /= 1024;
            unitIndex++;
        }

        return `${formattedSize.toFixed(2)} ${units[unitIndex]}`;
    };

    useEffect(() => {
        fetchImages();
    }, []);

    return (
        <Card className="w-full max-w-4xl mx-auto">
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle className="text-2xl">Docker Images</CardTitle>
                        <CardDescription>Manage your Docker images</CardDescription>
                    </div>
                    <div className="flex gap-2">
                        <Dialog open={pullDialogOpen} onOpenChange={setPullDialogOpen}>
                            <DialogTrigger asChild>
                                <Button variant="outline" className="flex gap-2">
                                    <Download className="h-4 w-4" />
                                    Pull Image
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Pull Docker Image</DialogTitle>
                                    <DialogDescription>
                                        Enter the name of the image you want to pull from Docker Hub
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="my-4">
                                    <Input
                                        placeholder="e.g., nginx:latest"
                                        value={newImageName}
                                        onChange={(e) => setNewImageName(e.target.value)}
                                    />
                                </div>
                                {isPulling && (
                                    <div className="space-y-2">
                                        <p className="text-sm text-gray-500">{pullStatus}</p>
                                        {Object.entries(pullProgress).map(([id, progress]) => (
                                            <div key={id} className="space-y-1">
                                                <p className="text-xs text-gray-500">{id}</p>
                                                <Progress value={progress} />
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <DialogFooter>
                                    <Button
                                        variant="outline"
                                        onClick={() => setPullDialogOpen(false)}
                                        disabled={isPulling}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={handlePullImage}
                                        disabled={!newImageName || isPulling}
                                    >
                                        {isPulling ? 'Pulling...' : 'Pull'}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                        <Button
                            onClick={fetchImages}
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                        >
                            <RefreshCw className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {error && (
                    <Alert variant="destructive" className="mb-4">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                {loading ? (
                    <div className="flex justify-center items-center h-32">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Repository Tag</TableHead>
                                <TableHead>Size</TableHead>
                                <TableHead className="w-24">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {images.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center text-gray-500">
                                        No images found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                images.map((image, index) => (
                                    <TableRow key={index}>
                                        <TableCell className="font-mono">{image.repo_tag}</TableCell>
                                        <TableCell>{formatSize(image.size)}</TableCell>
                                        <TableCell>
                                            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                                                <DialogTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-100"
                                                        onClick={() => setSelectedImage(image.repo_tag)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent>
                                                    <DialogHeader>
                                                        <DialogTitle>Delete Image</DialogTitle>
                                                        <DialogDescription>
                                                            Are you sure you want to delete the image "{selectedImage}"?
                                                            This action cannot be undone.
                                                        </DialogDescription>
                                                    </DialogHeader>
                                                    <DialogFooter>
                                                        <Button
                                                            variant="outline"
                                                            onClick={() => setDeleteDialogOpen(false)}
                                                        >
                                                            Cancel
                                                        </Button>
                                                        <Button
                                                            variant="destructive"
                                                            onClick={() => handleDeleteImage(selectedImage)}
                                                        >
                                                            Delete
                                                        </Button>
                                                    </DialogFooter>
                                                </DialogContent>
                                            </Dialog>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    );
};

export default DockerImagesManager;