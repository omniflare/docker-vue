interface DockerError {
    DockerError: string;
}

interface UnexpectedError {
    UnexpectedError: string;
}

export type NetworkError = DockerError | UnexpectedError;