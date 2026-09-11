const SERVICE: &str = "dev.valensco.relay";

pub fn save(provider_id: &str, api_key: &str) -> Result<(), String> {
    keyring::Entry::new(SERVICE, provider_id)
        .map_err(|_| "Unable to access the operating system credential store".to_string())?
        .set_password(api_key)
        .map_err(|_| {
            "Unable to save the API key in the operating system credential store".to_string()
        })
}

pub fn load(provider_id: &str) -> Result<String, String> {
    keyring::Entry::new(SERVICE, provider_id)
        .map_err(|_| "Unable to access the operating system credential store".to_string())?
        .get_password()
        .map_err(|_| "No API key is stored for this provider".to_string())
}

pub fn remove(provider_id: &str) -> Result<(), String> {
    let entry = keyring::Entry::new(SERVICE, provider_id)
        .map_err(|_| "Unable to access the operating system credential store".to_string())?;
    match entry.delete_credential() {
        Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
        Err(_) => Err("Unable to delete the stored API key".to_string()),
    }
}
