# DockerVue: A Modern Docker Desktop Alternative

[![Rust](https://img.shields.io/badge/rust-%23000000.svg?&logo=rust&logoColor=white)](https://www.rust-lang.org/)
[![Tauri](https://img.shields.io/badge/tauri-%2324C8DB.svg?&logo=tauri&logoColor=white)](https://tauri.app/)
[![React](https://img.shields.io/badge/react-%2361DAFB.svg?&logo=react&logoColor=black)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/typescript-%233178C6.svg?&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

A lightning-fast, resource-efficient alternative to Docker Desktop, built specifically with Linux users in mind. This project combines the power of Rust's performance with modern web technologies to create a seamless Docker management experience.

## 🌟 Why Another Docker Desktop?

While Docker Desktop is a fantastic tool, its implementation on Linux can be resource-intensive and sometimes sluggish. DockerVue was created to address these pain points by:

- Providing a native-like experience with minimal resource overhead
- Leveraging Rust's safety and performance capabilities
- Offering a modern, responsive UI that feels natural on Linux systems
- Ensuring smooth container management with real-time updates

## 🚀 Features

- **Container Management**
  - Create, start, stop, and delete containers
  - Real-time container logs
  - Port mapping configuration
  - Resource usage monitoring
- **Image Management**
  - Pull, remove, and manage Docker images
  - Image size tracking
  - Repository tag management
- **Network Operations**
  - Create and manage Docker networks
  - Connect/disconnect containers to networks
  - Network driver configuration
- **Volume Management**
  - Create and manage Docker volumes
  - Mount point visualization
  - Volume driver support

## 🛠️ Technology Stack

### Backend (Tauri + Rust)
- **Tauri**: Provides the application framework and native capabilities
- **Bollard**: Rust Docker API client for container management
- **Tokio**: Async runtime for handling concurrent operations
- **Serde**: Serialization/deserialization of Docker API data

### Frontend
- **React**: UI component library
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first styling
- **shadcn/ui**: Modern component library
- **Lucide Icons**: Beautiful, consistent iconography

## 💡 Key Implementation Details

### Container Management
The core container management functionality is implemented using Bollard's Docker API client:

```rust
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
```

### Real-time Container Logs
Implemented streaming logs with proper error handling:

```rust
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
                on_event.send(log.to_string())?;
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
```

## 🏗️ Architecture

The application follows a clean architecture pattern:

```
src/
├── main.rs           # Application entry point
├── error.rs          # Error handling
├── payload/          # Data structures
    ├── mod.rs
    └── types.rs

```

## 🚦 Getting Started

### Prerequisites
- Rust 1.70 or higher
- Node.js 16 or higher
- Docker Engine running on your system

### Installation

1. Clone the repository:
```bash
git clone https://github.com/omniflare/docker-vue.git
cd docker-vue
```

2. Install dependencies:
```bash
# Install Rust dependencies
cargo install tauri-cli

# Install frontend dependencies
cd src-tauri
yarn install
```

3. Run the development version:
```bash
cargo tauri dev
```

4. Build for production:
```bash
cargo tauri build
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Tauri](https://tauri.app/) for providing the framework that makes this possible
- [Bollard](https://github.com/fussybeaver/bollard) for the excellent Docker API implementation
- [shadcn/ui](https://ui.shadcn.com/) for the beautiful component library
- The Docker community for inspiration and support

## 📫 Contact

For questions and support, please open an issue in the GitHub repository.

---

Made with ❤️ for the Linux community by github.com/omniflare
