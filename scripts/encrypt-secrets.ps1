<#
.SYNOPSIS
    Encrypt secrets for Molty-DSSP — generates AES-256-GCM encrypted ciphertext
    that only the Pi's config module can decrypt at runtime (with the master key).

.DESCRIPTION
    Takes username and password as input, encrypts them as a JSON blob,
    outputs the ciphertext (base64) for storage in .env.enc.

    Run this on your desktop (Windows) — the master key stays with you.

.PARAMETER Username
    The ProtonMail username/email.

.PARAMETER Password
    The ProtonMail password.

.PARAMETER OutFile
    (Optional) Path to write the ciphertext file. If omitted, prints to console.

.EXAMPLE
    .\encrypt-secrets.ps1 -Username "whiteturtle8077@proton.me" -Password "yourpassword"
    Outputs ciphertext to console. Copy-paste to Molty.

.EXAMPLE
    .\encrypt-secrets.ps1 -Username "whiteturtle8077@proton.me" -Password "yourpassword" -OutFile "secrets.enc"
    Writes ciphertext to secrets.enc. Pipe this file to the Pi.
#>

param(
    [Parameter(Mandatory = $true)]
    [string]$Username,

    [Parameter(Mandatory = $true)]
    [string]$Password,

    [Parameter(Mandatory = $false)]
    [string]$OutFile
)

# --- Master Key ---
# Generate a random 256-bit key (32 bytes), output as hex.
# This is your master key — store it safely on your desktop ONLY.
$keyBytes = [byte[]]::new(32)
[System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($keyBytes)
$masterKey = [System.BitConverter]::ToString($keyBytes) -replace '-', ''

Write-Host "`n🔐 MASTER KEY (SAVE THIS — you'll never see it again):" -ForegroundColor Yellow
Write-Host $masterKey -ForegroundColor Cyan
Write-Host "Store this in a secure place on your desktop only." -ForegroundColor Yellow
Write-Host "You will need it at test runtime to decrypt on the Pi.`n" -ForegroundColor Yellow

# --- Encrypt ---
# Build the JSON payload
$plaintext = @"
{"username":"$Username","password":"$Password"}
"@

$plainBytes = [System.Text.Encoding]::UTF8.GetBytes($plaintext)

# AES-256-GCM via .NET
$aes = [System.Security.Cryptography.AesGcm]::new($keyBytes, 16)  # 16-byte tag (128-bit)
$nonce = [byte[]]::new(12)  # 96-bit nonce
[System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($nonce)
$cipherBytes = [byte[]]::new($plainBytes.Length)
$tag = [byte[]]::new(16)

$aes.Encrypt($nonce, $plainBytes, $cipherBytes, $tag)

# Pack: nonce (12) + tag (16) + ciphertext (rest)
$combined = [byte[]]::new($nonce.Length + $tag.Length + $cipherBytes.Length)
[Buffer]::BlockCopy($nonce, 0, $combined, 0, $nonce.Length)
[Buffer]::BlockCopy($tag, 0, $combined, $nonce.Length, $tag.Length)
[Buffer]::BlockCopy($cipherBytes, 0, $combined, $nonce.Length + $tag.Length, $cipherBytes.Length)

$ciphertextBase64 = [System.Convert]::ToBase64String($combined)

# --- Output ---
if ($OutFile) {
    # Write as a single line of base64
    $ciphertextBase64 | Out-File -FilePath $OutFile -Encoding ascii -NoNewline
    Write-Host "✅ Ciphertext written to: $OutFile" -ForegroundColor Green
    Write-Host "Send this file to the Pi via scp or copy its contents to Molty.`n" -ForegroundColor Green

    Write-Host "To verify decryption on your desktop first (optional):" -ForegroundColor DarkGray
    Write-Host '  .\decrypt-secrets.ps1 -CipherText (Get-Content .\secrets.enc -Raw) -MasterKey "<your-key>"' -ForegroundColor DarkGray
} else {
    Write-Host "📦 CIPHERTEXT (send this to the Pi / Molty):" -ForegroundColor Green
    Write-Host $ciphertextBase64 -ForegroundColor White
    Write-Host "`nTo store: create or overwrite output/.env.enc with this single line." -ForegroundColor DarkGray
}

Write-Host "`n⚠️  Delete your password from clipboard and terminal history after done." -ForegroundColor Red
