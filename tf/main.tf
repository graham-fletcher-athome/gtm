variable "project" {
    description="What projet is used to host the GTM functions"
}

variable "location" {
    default = "europe-west2"
}

variable "zip_path" {
    default = "./index.zip"
}

variable "secret" {
    description="Secret"
}

resource "google_project_service" "vertex_service" {
    project=var.project
    service="aiplatform.googleapis.com"
    disable_dependent_services=true
}

resource "google_project_service" "storage_service" {
    project=var.project
    service="storage.googleapis.com"
    disable_dependent_services=true
}

resource "google_project_service" "cloud_functions_service" {
    project=var.project
    service="cloudfunctions.googleapis.com"
    disable_dependent_services=true
}
resource "google_project_service" "reg_service" {
    project=var.project
    service="artifactregistry.googleapis.com"
    disable_dependent_services=true
}


resource "random_string" "rid" {
    length = 4
    special = false
    upper=false

}

resource "google_service_account" "sa" {
    project=var.project
    account_id = format("gtm-%s",random_string.rid.result)
    display_name = format("gtm-%s",random_string.rid.result)
}

resource "google_project_iam_member" "iam" {
    project=var.project
    role   ="roles/aiplatform.user"
    member = format("serviceAccount:%s",google_service_account.sa.email)

    
}

resource "google_project_iam_member" "iam_reg" {
    project=var.project
    role   ="roles/artifactregistry.reader"
    member = format("serviceAccount:%s",google_service_account.sa.email)
}
    

resource "google_storage_bucket" "upload" {
    project=var.project
    name=format("gtm-%s",random_string.rid.result)
    location=var.location
    uniform_bucket_level_access = true
    depends_on=[google_project_service.storage_service]
}

resource "google_storage_bucket_object" "archive" {
    name="index.zip"
    bucket = google_storage_bucket.upload.name
    source = var.zip_path
}

resource google_cloudfunctions_function "cf" {
    name=format("gtm-%s",random_string.rid.result)
    description="gtm"
    runtime="python312"
    available_memory_mb = 512
    source_archive_bucket = google_storage_bucket.upload.name
    source_archive_object = google_storage_bucket_object.archive.name
    trigger_http    = true
    entry_point     = "vertex_chat_function"
    region = var.location
    project = var.project
    service_account_email = google_service_account.sa.email
    environment_variables = {
        GCP_PROJECT=var.project
        GTM_SECRET=var.secret
    }
    depends_on=[google_project_service.cloud_functions_service,google_project_iam_member.iam_reg]
    lifecycle {
        replace_triggered_by=[google_storage_bucket_object.archive]
    }
}

resource "google_cloudfunctions_function_iam_member" "cf_iam"{
    project=var.project
    region = google_cloudfunctions_function.cf.region
    cloud_function = google_cloudfunctions_function.cf.name
    role = "roles/cloudfunctions.invoker"
    member = "allUsers"
}



