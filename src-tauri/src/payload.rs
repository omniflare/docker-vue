use std::collections::HashMap;

use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug)]
pub enum VolumeScopeEnum { 
    #[serde(rename = "")]
    EMPTY,
    #[serde(rename = "local")]
    LOCAL,
    #[serde(rename = "global")]
    GLOBAL,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct Container {
    pub name : Option<String>,
    pub status : Option<String>,
    pub state : Option<String>,
    pub ports : Option<Vec<String>>
}

#[derive(Serialize, Deserialize, Debug)]
pub struct Image{
    pub repo_tag : String,
    pub size : i64
}

#[derive(Serialize, Deserialize, Debug)]
pub struct Volume {
    pub name: String,
    pub driver: String,
    pub mountpoint: Option<String>,
    pub labels: Option<std::collections::HashMap<String, String>>,
    pub scope: Option<bollard::secret::VolumeScopeEnum>,
    pub status: Option<HashMap<String, HashMap<(), ()>>>
}
#[derive(Serialize, Deserialize, Debug)]
pub struct Network {
    pub id: String,
    pub name: String,
    pub driver: String,
    pub scope: String,
    pub internal: Option<bool>,
    pub enable_ipv6: Option<bool>,
    pub labels: Option<std::collections::HashMap<String, String>>
}

#[derive(Serialize, Deserialize, Debug)]
pub struct IpamConfig {
    pub subnet: Option<String>,
    pub gateway: Option<String>,
    pub ip_range: Option<String>
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ProgressInfo {
    pub status: String,
    pub progress_detail: Option<ProgressDetail>,
    pub id: Option<String>
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ProgressDetail {
    pub current: Option<i64>,
    pub total: Option<i64>
}

#[derive(Serialize, Deserialize, Debug)]
pub struct PortBinding{
    pub host_ip : Option<String>,
    pub host_port : Option<String>
}


#[derive(Debug, Clone, serde::Serialize)]
pub struct NetworkContainer {
    pub id: String,
    pub name: String,
    pub network_id: Option<std::string::String>,
}