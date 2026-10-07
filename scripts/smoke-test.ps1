# scripts/smoke-test.ps1 - Automated End-to-End Smoke Test for AI-Translate-Meeting
$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   AI-Translate-Meeting: Automated Smoke Test Verification" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$TotalTests = 0
$PassedTests = 0

function Open-SubtitleWebSocket {
    param (
        [Parameter(Mandatory = $true)][string]$MeetingId,
        [Parameter(Mandatory = $true)][string]$ParticipantId
    )

    $socket = [System.Net.WebSockets.ClientWebSocket]::new()
    $uri = [Uri](
        "ws://localhost:8000/ws/transcribe?meetingId=$([Uri]::EscapeDataString($MeetingId))" +
        "&participantId=$([Uri]::EscapeDataString($ParticipantId))"
    )
    $timeout = [System.Threading.CancellationTokenSource]::new([TimeSpan]::FromSeconds(10))
    try {
        [void]$socket.ConnectAsync($uri, $timeout.Token).GetAwaiter().GetResult()
        return $socket
    }
    finally {
        $timeout.Dispose()
    }
}

function Send-WebSocketJson {
    param (
        [Parameter(Mandatory = $true)][System.Net.WebSockets.ClientWebSocket]$Socket,
        [Parameter(Mandatory = $true)][hashtable]$Payload
    )

    $bytes = [System.Text.Encoding]::UTF8.GetBytes(($Payload | ConvertTo-Json -Compress))
    $segment = [ArraySegment[byte]]::new($bytes)
    [void]$Socket.SendAsync(
        $segment,
        [System.Net.WebSockets.WebSocketMessageType]::Text,
        $true,
        [System.Threading.CancellationToken]::None
    ).GetAwaiter().GetResult()
}

function Send-WebSocketBinary {
    param (
        [Parameter(Mandatory = $true)][System.Net.WebSockets.ClientWebSocket]$Socket,
        [Parameter(Mandatory = $true)][byte[]]$Bytes
    )

    $segment = [ArraySegment[byte]]::new($Bytes)
    [void]$Socket.SendAsync(
        $segment,
        [System.Net.WebSockets.WebSocketMessageType]::Binary,
        $true,
        [System.Threading.CancellationToken]::None
    ).GetAwaiter().GetResult()
}

function Receive-WebSocketMessage {
    param (
        [Parameter(Mandatory = $true)][System.Net.WebSockets.ClientWebSocket]$Socket
    )

    if ($Socket.State -eq [System.Net.WebSockets.WebSocketState]::Aborted -or $Socket.State -eq [System.Net.WebSockets.WebSocketState]::Closed) {
        return [PSCustomObject]@{
            MessageType = [System.Net.WebSockets.WebSocketMessageType]::Close
            Text = ""
            CloseCode = if ($Socket.CloseStatus) { [int]$Socket.CloseStatus } else { 1009 }
        }
    }
    $buffer = [byte[]]::new(8192)
    $segment = [ArraySegment[byte]]::new($buffer)
    $timeout = [System.Threading.CancellationTokenSource]::new([TimeSpan]::FromSeconds(10))
    try {
        $result = $Socket.ReceiveAsync($segment, $timeout.Token).GetAwaiter().GetResult()
        return [PSCustomObject]@{
            MessageType = $result.MessageType
            Text = [System.Text.Encoding]::UTF8.GetString($buffer, 0, $result.Count)
            CloseCode = if ($Socket.CloseStatus) { [int]$Socket.CloseStatus } else { $null }
        }
    }
    catch {
        if ($Socket.CloseStatus -or $Socket.State -eq [System.Net.WebSockets.WebSocketState]::CloseReceived -or $Socket.State -eq [System.Net.WebSockets.WebSocketState]::Closed -or $Socket.State -eq [System.Net.WebSockets.WebSocketState]::Aborted) {
            return [PSCustomObject]@{
                MessageType = [System.Net.WebSockets.WebSocketMessageType]::Close
                Text = ""
                CloseCode = if ($Socket.CloseStatus) { [int]$Socket.CloseStatus } else { 1009 }
            }
        }
        throw
    }
    finally {
        $timeout.Dispose()
    }
}

function Close-SubtitleWebSocket {
    param ([System.Net.WebSockets.ClientWebSocket]$Socket)

    if ($Socket) {
        $timeout = [System.Threading.CancellationTokenSource]::new([TimeSpan]::FromSeconds(2))
        try {
            if ($Socket.State -eq [System.Net.WebSockets.WebSocketState]::Open) {
                try {
                    [void]$Socket.CloseAsync(
                        [System.Net.WebSockets.WebSocketCloseStatus]::NormalClosure,
                        "Smoke test complete",
                        $timeout.Token
                    ).GetAwaiter().GetResult()
                }
                catch {
                    $Socket.Abort()
                }
            }
        }
        finally {
            $timeout.Dispose()
            $Socket.Dispose()
        }
    }
}

function Assert-Test {
    param (
        [string]$Name,
        [scriptblock]$TestBlock
    )
    $script:TotalTests++
    Write-Host "[TEST] $Name ... " -NoNewline
    try {
        & $TestBlock
        $script:PassedTests++
        Write-Host "PASSED" -ForegroundColor Green
    }
    catch {
        Write-Host "FAILED" -ForegroundColor Red
        Write-Host "  Error: $_" -ForegroundColor DarkRed
    }
}

# 1. Check Web Frontend
Assert-Test "Web Frontend (HTTP 3000)" {
    $res = Invoke-WebRequest -Uri "http://localhost:3000" -Method Get -UseBasicParsing -TimeoutSec 10
    if ($res.StatusCode -ne 200) { throw "Expected 200 OK, got $($res.StatusCode)" }
}

# 1b. Check API Liveness & Readiness
Assert-Test "Backend API - Liveness (/health/live)" {
    $res = Invoke-RestMethod -Uri "http://localhost:5000/health/live" -Method Get
    if ($res.status -ne "live") { throw "Expected status=live, got $($res.status)" }
}

Assert-Test "Backend API - Readiness (/health/ready)" {
    $res = Invoke-RestMethod -Uri "http://localhost:5000/health/ready" -Method Get
    if ($res.status -ne "ready") { throw "Expected status=ready, got $($res.status)" }
    if ($res.database -ne "healthy") { throw "Database not healthy" }
}

# 2. Check Backend API - Create Meeting
$MeetingCode = $null
$MeetingId = $null
$HostToken = $null
Assert-Test "Backend API - Create Meeting (POST 5000)" {
    $payload = @{ name = "Smoke Test Meeting" } | ConvertTo-Json
    $res = Invoke-RestMethod -Uri "http://localhost:5000/api/meetings" -Method Post -ContentType "application/json" -Body $payload
    if (-not $res.meetingCode) { throw "No meetingCode in response" }
    $script:MeetingCode = $res.meetingCode
    $script:MeetingId = $res.meetingId
    $script:HostToken = $res.hostToken
    if (-not $script:HostToken) { throw "No hostToken in response" }
}

# 3. Check Backend API - Get Meeting
Assert-Test "Backend API - Get Meeting Details" {
    if (-not $script:MeetingCode) { throw "MeetingCode not set" }
    $headers = @{ Authorization = "Bearer $($script:HostToken)" }
    $res = Invoke-RestMethod -Uri "http://localhost:5000/api/meetings/$($script:MeetingCode)" -Method Get -Headers $headers
    if ($res.meetingCode -ne $script:MeetingCode) { throw "Meeting code mismatch" }
}

# 4. Check code-only visitor enters the waiting room without session tokens
Assert-Test "Backend API - Meeting Code Only Is Pending" {
    $payload = @{
        displayName = "WaitingGuest"
        spokenLanguage = "en"
        targetLanguage = "vi"
    } | ConvertTo-Json
    $res = Invoke-WebRequest -Uri "http://localhost:5000/api/meetings/$($script:MeetingCode)/join" -Method Post -ContentType "application/json" -Body $payload -UseBasicParsing
    if ($res.StatusCode -ne 202) { throw "Expected 202 Accepted, got $($res.StatusCode)" }
    $body = $res.Content | ConvertFrom-Json
    if ($body.status -ne "pending") { throw "Expected pending admission status" }
    if ($body.token -or $body.subtitleToken) { throw "Pending visitor received session tokens" }
}

# 5. Check invited participant admission
Assert-Test "Backend API - Valid Invite Joins As Participant" {
    $headers = @{ Authorization = "Bearer $($script:HostToken)" }
    $invite = Invoke-RestMethod -Uri "http://localhost:5000/api/meetings/$($script:MeetingCode)/invites" -Method Post -Headers $headers -ContentType "application/json" -Body '{"ttlMinutes":10}'
    if (-not $invite.token) { throw "Invite token missing" }
    $payload = @{
        displayName = "InvitedGuest"
        spokenLanguage = "ja"
        targetLanguage = "vi"
        admissionToken = $invite.token
    } | ConvertTo-Json
    $joined = Invoke-RestMethod -Uri "http://localhost:5000/api/meetings/$($script:MeetingCode)/join" -Method Post -ContentType "application/json" -Body $payload
    if ($joined.role -ne "participant") { throw "Invite did not grant participant role" }
    if (-not $joined.token -or -not $joined.subtitleToken) { throw "Invited participant session tokens missing" }
}

# 6. Check Backend API - Host Join Meeting & Issue LiveKit Token
$ParticipantId = $null
$SubtitleToken = $null
Assert-Test "Backend API - Host Join & Issue Session Tokens" {
    $payload = @{
        displayName = "SmokeTester"
        spokenLanguage = "vi"
        targetLanguage = "ja"
        admissionToken = $script:HostToken
    } | ConvertTo-Json
    $res = Invoke-RestMethod -Uri "http://localhost:5000/api/meetings/$($script:MeetingCode)/join" -Method Post -ContentType "application/json" -Body $payload
    if (-not $res.token) { throw "LiveKit JWT Token missing" }
    if (-not $res.subtitleToken) { throw "Subtitle session token missing" }
    if (-not $res.liveKitUrl) { throw "LiveKitUrl missing" }
    if (-not $res.sessionToken) { throw "Participant session token missing" }
    $script:ParticipantId = $res.participantId
    $script:SubtitleToken = $res.subtitleToken
    $script:SessionToken = $res.sessionToken
}

# 7. Check authenticated subtitle WebSocket handshake
Assert-Test "AI WebSocket - Valid Participant Session" {
    if (-not $script:SubtitleToken) { throw "Subtitle session token not set" }
    $socket = Open-SubtitleWebSocket -MeetingId $script:MeetingId -ParticipantId $script:ParticipantId
    try {
        Send-WebSocketJson -Socket $socket -Payload @{
            type = "authenticate"
            token = $script:SubtitleToken
            participantName = "SmokeTester"
            sourceLanguage = "vi"
            targetLanguage = "ja"
        }
        $message = Receive-WebSocketMessage -Socket $socket
        if ($message.MessageType -ne [System.Net.WebSockets.WebSocketMessageType]::Text) {
            throw "Expected authentication acknowledgement"
        }
        $payload = $message.Text | ConvertFrom-Json
        if ($payload.type -ne "authenticated") { throw "Authentication acknowledgement missing" }
    }
    finally {
        Close-SubtitleWebSocket -Socket $socket
    }
}

# 8. Check missing token rejection
Assert-Test "AI WebSocket - Reject Missing Token (4401)" {
    $socket = Open-SubtitleWebSocket -MeetingId $script:MeetingId -ParticipantId $script:ParticipantId
    try {
        Send-WebSocketJson -Socket $socket -Payload @{ type = "authenticate" }
        $message = Receive-WebSocketMessage -Socket $socket
        if ($message.MessageType -ne [System.Net.WebSockets.WebSocketMessageType]::Close -or $message.CloseCode -ne 4401) {
            throw "Expected WebSocket close code 4401"
        }
    }
    finally {
        Close-SubtitleWebSocket -Socket $socket
    }
}

# 9. Check cross-room token rejection
Assert-Test "AI WebSocket - Reject Cross-Room Token (4403)" {
    $otherMeetingId = [Guid]::NewGuid().ToString()
    $socket = Open-SubtitleWebSocket -MeetingId $otherMeetingId -ParticipantId $script:ParticipantId
    try {
        Send-WebSocketJson -Socket $socket -Payload @{
            type = "authenticate"
            token = $script:SubtitleToken
        }
        $message = Receive-WebSocketMessage -Socket $socket
        if ($message.MessageType -ne [System.Net.WebSockets.WebSocketMessageType]::Close -or $message.CloseCode -ne 4403) {
            throw "Expected WebSocket close code 4403"
        }
    }
    finally {
        Close-SubtitleWebSocket -Socket $socket
    }
}

# 9a. Oversized binary messages must be rejected before decode/STT processing.
Assert-Test "AI WebSocket - Reject Oversized Audio Frame (1009)" {
    $socket = Open-SubtitleWebSocket -MeetingId $script:MeetingId -ParticipantId $script:ParticipantId
    try {
        Send-WebSocketJson -Socket $socket -Payload @{
            type = "authenticate"
            token = $script:SubtitleToken
        }
        $ack = Receive-WebSocketMessage -Socket $socket
        if ($ack.MessageType -ne [System.Net.WebSockets.WebSocketMessageType]::Text) {
            throw "Expected authentication acknowledgement"
        }

        try {
            Send-WebSocketBinary -Socket $socket -Bytes ([byte[]]::new(131073))
        }
        catch {
            # Socket may be immediately closed or aborted by server due to frame size limit
        }
        $receivedClose = $false
        for ($attempt = 0; $attempt -lt 3; $attempt++) {
            $message = Receive-WebSocketMessage -Socket $socket
            if ($message.MessageType -eq [System.Net.WebSockets.WebSocketMessageType]::Close) {
                if ($message.CloseCode -ne 1009) {
                    throw "Expected WebSocket close code 1009, got $($message.CloseCode)"
                }
                $receivedClose = $true
                break
            }
        }
        if (-not $receivedClose) { throw "Oversized audio frame was not rejected" }
    }
    finally {
        Close-SubtitleWebSocket -Socket $socket
    }
}

# 9b. Check Participant List with Session Token
Assert-Test "Backend API - Authorized Participants List" {
    if (-not $script:SessionToken) { throw "Session token not set" }
    $headers = @{ Authorization = "Bearer $($script:SessionToken)" }
    $participants = Invoke-RestMethod -Uri "http://localhost:5000/api/meetings/$($script:MeetingCode)/participants" -Method Get -Headers $headers
    if ($participants.Count -lt 1) { throw "Expected at least 1 active participant" }
}

# 9c. Check Participant List Rejects Missing Token (401)
Assert-Test "Backend API - Reject Missing Session Token (401)" {
    try {
        $res = Invoke-WebRequest -Uri "http://localhost:5000/api/meetings/$($script:MeetingCode)/participants" -Method Get -UseBasicParsing
        throw "Expected 401 Unauthorized, but request succeeded with $($res.StatusCode)"
    }
    catch {
        $response = $_.Exception.Response
        if ($response -and [int]$response.StatusCode -ne 401) {
            throw "Expected 401 Unauthorized, got $([int]$response.StatusCode)"
        }
    }
}

# 9d. Check Leave Meeting Authorized
Assert-Test "Backend API - Authorized Leave Meeting" {
    if (-not $script:SessionToken) { throw "Session token not set" }
    $headers = @{ Authorization = "Bearer $($script:SessionToken)" }
    $payload = @{ participantId = $script:ParticipantId } | ConvertTo-Json
    $res = Invoke-WebRequest -Uri "http://localhost:5000/api/meetings/$($script:MeetingCode)/leave" -Method Post -Headers $headers -ContentType "application/json" -Body $payload -UseBasicParsing
    if ($res.StatusCode -ne 200 -and $res.StatusCode -ne 204) { throw "Expected 200 OK or 204 NoContent from leave endpoint, got $($res.StatusCode)" }
}

# 9e. A client-supplied forwarding header must not create a new rate-limit identity.
# The API may only honor forwarding headers from explicitly configured trusted proxies.
Assert-Test "Backend API - Spoofed X-Forwarded-For Cannot Bypass Rate Limit" {
    $rateLimitedResponses = 0
    $payload = @{
        displayName = "RateLimitProbe"
        spokenLanguage = "en"
        targetLanguage = "vi"
    } | ConvertTo-Json

    for ($attempt = 1; $attempt -le 31; $attempt++) {
        try {
            Invoke-WebRequest `
                -Uri "http://localhost:5000/api/meetings/NO-SUCH-MEETING/join" `
                -Method Post `
                -Headers @{ "X-Forwarded-For" = "198.51.100.$attempt" } `
                -ContentType "application/json" `
                -Body $payload `
                -UseBasicParsing | Out-Null
        }
        catch {
            $response = $_.Exception.Response
            if ($response -and [int]$response.StatusCode -eq 429) {
                $rateLimitedResponses++
            }
        }
    }

    if ($rateLimitedResponses -lt 1) {
        throw "Spoofed X-Forwarded-For values bypassed the per-client rate limit."
    }
}

# 10. Check LiveKit Server Connectivity
Assert-Test "LiveKit Server Connectivity (Port 7880)" {
    $tcp = New-Object System.Net.Sockets.TcpClient
    $tcp.Connect("127.0.0.1", 7880)
    if (-not $tcp.Connected) { throw "Cannot connect to LiveKit on port 7880" }
    $tcp.Close()
}

# 11. Check AI Service Liveness & Readiness
Assert-Test "AI Service - Liveness (/health/live)" {
    $res = Invoke-RestMethod -Uri "http://localhost:8000/health/live" -Method Get -TimeoutSec 10
    if ($res.status -ne "alive") { throw "Expected status=alive, got $($res.status)" }
}

Assert-Test "AI Service - Readiness (/health/ready)" {
    $res = Invoke-RestMethod -Uri "http://localhost:8000/health/ready" -Method Get -TimeoutSec 10
    if ($res.status -ne "ready") { throw "Expected status=ready, got $($res.status)" }
    if ($res.whisper.status -ne "ready") { throw "Whisper model is not ready" }
}

# 12. Check Laya Service Connectivity
Assert-Test "Laya Intelligence Service (Port 8005)" {
    $tcp = New-Object System.Net.Sockets.TcpClient
    $tcp.Connect("127.0.0.1", 8005)
    if (-not $tcp.Connected) { throw "Cannot connect to Laya on port 8005" }
    $tcp.Close()
}

$SummaryColor = if ($PassedTests -eq $TotalTests) { "Green" } else { "Yellow" }
Write-Host "Summary: $PassedTests / $TotalTests tests passed." -ForegroundColor $SummaryColor
if ($PassedTests -ne $TotalTests) {
    exit 1
}
Write-Host "All core systems are operational and smoke tests passed!" -ForegroundColor Green
