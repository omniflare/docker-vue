import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";

interface Image {
    id: string,
    repo_tag: string,
    size: string
}

export default function List() {
    const [items, setItems] = useState<Image[]>();

    useEffect(() => {
        async function getData() {
            const images: Image[] = await invoke("list_images");
            setItems(images);
        }
        getData();
    }, []);

    return (
        <div className="">

        {
            items?.map((image) => (
                <div className="">
                    {image.repo_tag}
                </div>
            ))
        }
        </div>
    );
}