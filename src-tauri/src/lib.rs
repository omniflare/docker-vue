use bollard::container::{
    Config, CreateContainerOptions, KillContainerOptions, ListContainersOptions, LogsOptions,
    StopContainerOptions,
};
use bollard::image::{CreateImageOptions, ListImagesOptions, RemoveImageOptions};
use bollard::network::{
    ConnectNetworkOptions, CreateNetworkOptions, DisconnectNetworkOptions,
    ListNetworksOptions,
};
use bollard::secret::HostConfig;
use bollard::volume::ListVolumesOptions;
use bollard::Docker;
use futures_util::StreamExt;
use payload::{Network, NetworkContainer, ProgressInfo, Volume};
use std::collections::HashMap;

use crate::error::CommandError;
use crate::payload::{Container, Image};
use tauri::ipc::Channel;
use tauri::{Emitter, State};

mod error;
mod payload;

struct AppState {
    docker: Docker,
}

#[tauri::command]
async fn list_containers(state: State<'_, AppState>) -> Result<Vec<Container>, CommandError> {
    let docker = &state.docker;

    let containers = docker
        .list_containers(Some(ListContainersOptions::<String> {
            all: true,
            ..Default::default()
        }))
        .await
        .map_err(|e| CommandError::DockerError(e.to_string()))?;

    let result = containers
        .into_iter()
        .map(|item| Container {
            name: item.names.and_then(|names| {
                names
                    .first()
                    .map(|name| name.strip_prefix('/').unwrap_or(name).to_owned())
            }),
            status: item.status,
            state: item.state,
            ports: item
                .ports
                .map(|ports| ports.into_iter().filter_map(|port| port.ip).collect()),
        })
        .collect();

    Ok(result)
}

#[tauri::command]
async fn list_images(state: State<'_, AppState>) -> Result<Vec<Image>, CommandError> {
    let docker = &state.docker;
    let images = docker
        .list_images(Some(ListImagesOptions::<String> {
            all: true,
            ..Default::default()
        }))
        .await
        .map_err(|err| CommandError::DockerError(err.to_string()))?;

    let result = images
        .into_iter()
        .map(|item| Image {
            repo_tag: item.repo_tags.first().unwrap_or(&String::new()).to_owned(),
            size: item.size,
        })
        .collect();

    Ok(result)
}

#[tauri::command]
async fn emit_logs(
    state: State<'_, AppState>,
    container_name: &str,
    on_event: Channel<String>,
) -> Result<(), CommandError> {
    let docker = &state.docker;
    let options = Some(LogsOptions::<String> {
        stdout: true,
        stderr: true,
        tail: "all".parse().unwrap(),
        ..Default::default()
    });

    let mut logs_stream = docker.logs(container_name, options);

    while let Some(log_result) = logs_stream.next().await {
        match log_result {
            Ok(log) => {
                on_event.send(log.to_string()).map_err(|e| {
                    CommandError::UnexpectedError(format!("Failed to emit log : {}", e))
                })?;
            }
            Err(e) => {
                return Err(CommandError::UnexpectedError(format!(
                    "Failed to fetch logs: {}",
                    e
                )));
            }
        }
    }
    Ok(())
}

#[tauri::command]
async fn create_container(
    state: State<'_, AppState>,
    image: String,
    port_mapping: Option<String>,
) -> Result<(), CommandError> {
    let docker = &state.docker;

    let port_bindings = port_mapping
        .as_ref()
        .map(|mapping| {
            let parts: Vec<&str> = mapping.split(':').collect();
            if parts.len() != 2 {
                return HashMap::new();
            }

            let mut port_bindings = HashMap::new();
            let host_port = parts[0];
            let container_port = parts[1];

            let host_binding = vec![bollard::service::PortBinding {
                host_ip: Some("0.0.0.0".to_string()),
                host_port: Some(host_port.to_string()),
            }];
            port_bindings.insert(format!("{}/tcp", container_port), Some(host_binding));

            port_bindings
        })
        .unwrap_or_default();

    let exposed_ports = port_mapping
        .map(|mapping| {
            let parts: Vec<&str> = mapping.split(':').collect();
            if parts.len() != 2 {
                return HashMap::new();
            }

            let mut exposed_ports = HashMap::new();
            let container_port = parts[1];
            exposed_ports.insert(format!("{}/tcp", container_port), HashMap::new());

            exposed_ports
        })
        .unwrap_or_default();

    let config = Config {
        image: Some(image),
        exposed_ports: Some(exposed_ports),
        host_config: Some(HostConfig {
            port_bindings: Some(port_bindings),
            ..Default::default()
        }),
        ..Default::default()
    };

    let response = docker
        .create_container(None::<CreateContainerOptions<String>>, config)
        .await
        .map_err(|e| CommandError::DockerError(format!("Failed to create container: {}", e)))?;

    docker
        .start_container::<String>(&response.id, None)
        .await
        .map_err(|e| CommandError::DockerError(format!("Failed to start container: {}", e)))?;

    Ok(())
}

#[tauri::command]
async fn remove_image(state: State<'_, AppState>, image: &str) -> Result<(), CommandError> {
    let docker = &state.docker;

    let options = RemoveImageOptions {
        force: true,
        ..Default::default()
    };

    match docker.remove_image(image, Some(options), None).await {
        Ok(_) => Ok(()),
        Err(e) => {
            if e.to_string().contains("No such image") {
                Err(CommandError::DockerError(format!(
                    "image '{}' not found: {}",
                    image, e
                )))
            } else if e.to_string().contains("permission denied") {
                Err(CommandError::DockerError(format!(
                    "Permission denied while attempting '{}': {}",
                    image, e
                )))
            } else {
                Err(CommandError::DockerError(format!(
                    "Failed to remove image '{}': {}",
                    image, e
                )))
            }
        }
    }

    // Ok(())
}

#[tauri::command]
async fn start_container(
    state: State<'_, AppState>,
    container_name: &str,
) -> Result<(), CommandError> {
    let docker = &state.docker;

    match docker.start_container::<String>(container_name, None).await {
        Ok(_) => {
            println!("Started container '{}' successfully.", container_name);
            Ok(())
        }
        Err(e) => {
            if e.to_string().contains("No such container") {
                Err(CommandError::DockerError(format!(
                    "Container '{}' not found: {}",
                    container_name, e
                )))
            } else if e.to_string().contains("permission denied") {
                Err(CommandError::DockerError(format!(
                    "Permission denied while attempting to start container '{}': {}",
                    container_name, e
                )))
            } else {
                Err(CommandError::DockerError(format!(
                    "Failed to start container '{}': {}",
                    container_name, e
                )))
            }
        }
    }
}

#[tauri::command]
async fn kill_container(
    state: State<'_, AppState>,
    container_name: &str,
) -> Result<(), CommandError> {
    let docker = &state.docker;
    let options = KillContainerOptions { signal: "SIGKILL" };

    match docker.kill_container(container_name, Some(options)).await {
        Ok(_) => {
            println!("Container '{}' killed successfully.", container_name);
            Ok(())
        }
        Err(e) => {
            if e.to_string().contains("No such container") {
                Err(CommandError::DockerError(format!(
                    "Container '{}' not found: {}",
                    container_name, e
                )))
            } else if e.to_string().contains("permission denied") {
                Err(CommandError::DockerError(format!(
                    "Permission denied while attempting to kill container '{}': {}",
                    container_name, e
                )))
            } else {
                Err(CommandError::DockerError(format!(
                    "Failed to kill container '{}': {}",
                    container_name, e
                )))
            }
        }
    }
}

#[tauri::command]
async fn delete_container(
    state: State<'_, AppState>,
    container_name: &str,
) -> Result<(), CommandError> {
    let docker = &state.docker;

    match docker
        .remove_container(
            container_name,
            Some(bollard::container::RemoveContainerOptions {
                force: true,
                v: true,
                ..Default::default()
            }),
        )
        .await
    {
        Ok(_) => {
            println!("Deleted container '{}' successfully.", container_name);
            Ok(())
        }
        Err(e) => {
            if e.to_string().contains("No such container") {
                Err(CommandError::DockerError(format!(
                    "Container '{}' not found: {}",
                    container_name, e
                )))
            } else if e.to_string().contains("permission denied") {
                Err(CommandError::DockerError(format!(
                    "Permission denied while attempting to delete container '{}': {}",
                    container_name, e
                )))
            } else {
                Err(CommandError::DockerError(format!(
                    "Failed to delete container '{}': {}",
                    container_name, e
                )))
            }
        }
    }
}

#[tauri::command]
async fn stop_container(
    state: State<'_, AppState>,
    container_name: &str,
) -> Result<(), CommandError> {
    let docker = &state.docker;
    let options = StopContainerOptions { t: 10 };

    match docker.stop_container(container_name, Some(options)).await {
        Ok(_) => {
            println!("stopped container : {} successfully", container_name);
            return Ok(());
        }
        Err(e) => {
            if e.to_string().contains("No such container") {
                return Err(CommandError::DockerError(format!(
                    "Container '{}' not found: {}",
                    container_name, e
                )));
            } else if e.to_string().contains("permission denied") {
                return Err(CommandError::DockerError(format!(
                    "Permission denied while attempting to kill container '{}': {}",
                    container_name, e
                )));
            } else {
                return Err(CommandError::DockerError(format!(
                    "Failed to kill container '{}': {}",
                    container_name, e
                )));
            }
        }
    }
}

#[tauri::command]
async fn create_volume(state: State<'_, AppState>, volume_name: &str) -> Result<(), CommandError> {
    let docker = &state.docker;

    match docker
        .create_volume(bollard::volume::CreateVolumeOptions {
            name: volume_name.to_string(),
            ..Default::default()
        })
        .await
    {
        Ok(_) => {
            println!("Volume '{}' created successfully.", volume_name);
            Ok(())
        }
        Err(e) => Err(CommandError::DockerError(format!(
            "Failed to create volume '{}': {}",
            volume_name, e
        ))),
    }
}

#[tauri::command]
async fn list_volumes(state: State<'_, AppState>) -> Result<Vec<Volume>, CommandError> {
    let docker = &state.docker;
    let mut filters = HashMap::new();
    filters.insert("dangling", vec!["1"]);
    let options = ListVolumesOptions { filters };
    match docker.list_volumes(Some(options)).await {
        Ok(response) => {
            let volumes = response
                .volumes
                .unwrap_or_default()
                .into_iter()
                .map(|v| Volume {
                    name: v.name,
                    driver: v.driver,
                    mountpoint: Some(v.mountpoint),
                    labels: Some(v.labels),
                    scope: v.scope,
                    status: v.status,
                })
                .collect();
            Ok(volumes)
        }
        Err(e) => Err(CommandError::DockerError(format!(
            "Failed to list volumes: {}",
            e
        ))),
    }
}

#[tauri::command]
async fn remove_volume(state: State<'_, AppState>, volume_name: &str) -> Result<(), CommandError> {
    let docker = &state.docker;

    match docker.remove_volume(volume_name, None).await {
        Ok(_) => {
            println!("Volume '{}' removed successfully.", volume_name);
            Ok(())
        }
        Err(e) => {
            if e.to_string().contains("No such volume") {
                Err(CommandError::DockerError(format!(
                    "Volume '{}' not found: {}",
                    volume_name, e
                )))
            } else if e.to_string().contains("in use") {
                Err(CommandError::DockerError(format!(
                    "Volume '{}' is in use and cannot be removed: {}",
                    volume_name, e
                )))
            } else {
                Err(CommandError::DockerError(format!(
                    "Failed to remove volume '{}': {}",
                    volume_name, e
                )))
            }
        }
    }
}

#[tauri::command]
async fn pause_container(
    state: State<'_, AppState>,
    container_name: &str,
) -> Result<(), CommandError> {
    let docker = &state.docker;

    docker
        .pause_container(container_name)
        .await
        .map_err(|e| CommandError::DockerError(format!("Failed to pause container: {}", e)))?;

    Ok(())
}

#[tauri::command]
async fn unpause_container(
    state: State<'_, AppState>,
    container_name: &str,
) -> Result<(), CommandError> {
    let docker = &state.docker;

    docker
        .unpause_container(container_name)
        .await
        .map_err(|e| CommandError::DockerError(format!("Failed to unpause container: {}", e)))?;

    Ok(())
}

#[tauri::command]
async fn list_networks(state: State<'_, AppState>) -> Result<Vec<Network>, CommandError> {
    let docker = &state.docker;

    let networks = docker
        .list_networks(Some(ListNetworksOptions::<String> {
            ..Default::default()
        }))
        .await
        .map_err(|e| CommandError::DockerError(e.to_string()))?;

    let result = networks
        .into_iter()
        .filter_map(|net| {
            Some(Network {
                id: net.id?,
                name: net.name?,
                driver: net.driver?,
                scope: net.scope?,
                internal: net.internal,
                enable_ipv6: net.enable_ipv6,
                labels: net.labels,
            })
        })
        .collect();

    Ok(result)
}

#[tauri::command]
async fn create_network(
    state: State<'_, AppState>,
    name: String,
    driver: Option<String>,
) -> Result<(), CommandError> {
    let docker = &state.docker;

    let driv = driver.unwrap_or_else(|| "bridge".to_string());

    let options = CreateNetworkOptions {
        name: name.as_str(),
        driver: driv.as_str(),
        ..Default::default()
    };

    docker
        .create_network(options)
        .await
        .map_err(|e| CommandError::DockerError(format!("Failed to create network: {}", e)))?;

    Ok(())
}

#[tauri::command]
async fn list_network_containers(
    state: State<'_, AppState>,
    network_name: &str,
) -> Result<Vec<NetworkContainer>, CommandError> {
    use bollard::network::InspectNetworkOptions;

    let docker = &state.docker;
    let network = docker
        .inspect_network(
            network_name,
            Some(InspectNetworkOptions {
                verbose: true,
                scope: "global",
            }),
        )
        .await
        .map_err(|e| CommandError::DockerError(format!("Failed to inspect network: {}", e)))?;
    let containers = match network.containers {
        Some(containers) => {
            containers
                .into_iter()
                .map(|(id, details)| NetworkContainer {
                    id,
                    name: details.name.unwrap_or_else(|| "Unnamed".to_string()),
                    network_id: network.id.clone(),
                })
                .collect::<Vec<_>>()
        }
        None => Vec::new(),
    };

    // println!(
    //     "Found {} containers in network '{}'",
    //     containers.len(),
    //     network_name
    // );
    Ok(containers)
}


#[tauri::command]
async fn remove_network(state: State<'_, AppState>, network_id: &str) -> Result<(), CommandError> {
    let docker = &state.docker;

    match docker.remove_network(network_id).await {
        Ok(_) => {
            println!("Network '{}' removed successfully.", network_id);
            Ok(())
        }
        Err(e) => {
            if e.to_string().contains("not found") {
                Err(CommandError::DockerError(format!(
                    "Network '{}' not found: {}",
                    network_id, e
                )))
            } else if e.to_string().contains("in use") {
                Err(CommandError::DockerError(format!(
                    "Network '{}' is in use: {}",
                    network_id, e
                )))
            } else {
                Err(CommandError::DockerError(format!(
                    "Failed to remove network '{}': {}",
                    network_id, e
                )))
            }
        }
    }
}

#[tauri::command]
async fn connect_container_to_network(
    state: State<'_, AppState>,
    container_id: &str,
    network_id: &str,
) -> Result<(), CommandError> {
    let docker = &state.docker;

    docker
        .connect_network(
            network_id,
            ConnectNetworkOptions {
                container: container_id,
                ..Default::default()
            },
        )
        .await
        .map_err(|e| {
            CommandError::DockerError(format!("Failed to connect container to network: {}", e))
        })?;

    Ok(())
}

#[tauri::command]
async fn pull_image(
    app_handle: tauri::AppHandle,
    state: State<'_, AppState>,
    image_name: String,
) -> Result<(), CommandError> {
    let docker = &state.docker;

    let options = Some(CreateImageOptions {
        from_image: image_name.as_str(),
        ..Default::default()
    });

    let mut pull_stream = docker.create_image(options, None, None);

    while let Some(result) = pull_stream.next().await {
        match result {
            Ok(output) => {
                if let Ok(progress) = serde_json::from_value::<ProgressInfo>(
                    serde_json::to_value(output).unwrap_or_default(),
                ) {
                    app_handle.emit("pull-progress", progress).map_err(|e| {
                        CommandError::UnexpectedError(format!(
                            "Failed to send progress update: {}",
                            e
                        ))
                    })?;
                }
            }
            Err(e) => {
                return Err(CommandError::DockerError(format!(
                    "Failed to pull image: {}",
                    e
                )));
            }
        }
    }

    Ok(())
}
#[tauri::command]
async fn disconnect_container_from_network(
    state: State<'_, AppState>,
    container_id: &str,
    network_id: &str,
) -> Result<(), CommandError> {
    let docker = &state.docker;

    docker
        .disconnect_network(
            network_id,
            DisconnectNetworkOptions {
                container: container_id,
                force: false,
            },
        )
        .await
        .map_err(|e| {
            CommandError::DockerError(format!(
                "Failed to disconnect container from network: {}",
                e
            ))
        })?;

    Ok(())
}


#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(AppState {
            docker: Docker::connect_with_local_defaults().unwrap(),
        })
        .invoke_handler(tauri::generate_handler![
            list_containers,
            list_images,
            emit_logs,
            kill_container,
            stop_container,
            remove_image,
            create_container,
            create_volume,
            remove_volume,
            disconnect_container_from_network,
            connect_container_to_network,
            remove_network,
            create_network,
            list_networks,
            pause_container,
            unpause_container,
            start_container,
            delete_container,
            pull_image,
            list_volumes,
            list_network_containers
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
