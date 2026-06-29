# Change these to a real device from config/devices.json.
$DeviceId = "PUT_REAL_DEVICE_ID_HERE"
$ApiKey = "PUT_REAL_API_KEY_HERE"
$BaseUrl = "http://localhost:3000"

function Send-TestEvent {
    param(
        [string]$Label,
        [string]$SensorType,
        [string]$EventName
    )

    $eventBody = @{
        device_id   = $DeviceId
        sensor_type = $SensorType
        event       = $EventName
        timestamp   = (Get-Date).ToUniversalTime().ToString("o")
    } | ConvertTo-Json -Compress

    try {
        $response = Invoke-WebRequest `
            -UseBasicParsing `
            -Uri "$BaseUrl/api/events" `
            -Method POST `
            -ContentType "application/json" `
            -Headers @{ "X-API-Key" = $ApiKey } `
            -Body $eventBody `
            -ErrorAction Stop

        Write-Host "`n$Label"
        $response.StatusCode
        $response.Content
    }
    catch {
        $statusCode = if ($_.Exception.Response) {
            [int]$_.Exception.Response.StatusCode
        } else {
            $null
        }

        Write-Host "`n$Label"
        Write-Host "Status: $statusCode"

        if ($_.ErrorDetails.Message) {
            Write-Host $_.ErrorDetails.Message
        } else {
            Write-Host $_.Exception.Message
        }
    }
}

# Expected: success (likely 201)
Send-TestEvent `
    -Label "VALID EVENT" `
    -SensorType "door" `
    -EventName "open"

# Expected: 400, invalid sensor_type
Send-TestEvent `
    -Label "INVALID SENSOR TYPE" `
    -SensorType "temperature" `
    -EventName "open"

# Expected: 400, invalid event for door
Send-TestEvent `
    -Label "INVALID EVENT FOR SENSOR" `
    -SensorType "door" `
    -EventName "detected"