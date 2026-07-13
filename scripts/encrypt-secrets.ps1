<#
.SYNOPSIS
    Encrypt secrets for Molty-DSSP -- generates AES-256-GCM encrypted ciphertext
    that only the Pi's config module can decrypt at runtime (with the master key).

.DESCRIPTION
    Takes username and password as input, encrypts them as a JSON blob,
    outputs the ciphertext (base64) for storage in .env.enc.

    Run this on your desktop (Windows) -- the master key stays with you.

.PARAMETER Username
    The ProtonMail username/email.

.PARAMETER Password
    The ProtonMail password.

.PARAMETER OutFile
    (Optional) Path to write the ciphertext file. If omitted, prints to console.

.EXAMPLE
    .\encrypt-secrets.ps1 -Username "whiteturtle8077@proton.me" -Password 'pw-with-double-quotes-inside'
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
$keyBytes = [byte[]]::new(32)
[System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($keyBytes)
$masterKey = [System.BitConverter]::ToString($keyBytes) -replace '-', ''

Write-Host ""
Write-Host "MASTER KEY (SAVE THIS -- you will never see it again):" -ForegroundColor Yellow
Write-Host $masterKey -ForegroundColor Cyan
Write-Host "Store this in a secure place on your desktop only." -ForegroundColor Yellow
Write-Host "You will need it at test runtime to decrypt on the Pi."
Write-Host ""

# --- Encrypt ---
$json = '{"username":"' + $Username + '","password":"' + $Password + '"}'
$plainBytes = [System.Text.Encoding]::UTF8.GetBytes($json)

# AES-256-GCM
$nonce = [byte[]]::new(12)
[System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($nonce)
$cipherBytes = [byte[]]::new($plainBytes.Length)
$tag = [byte[]]::new(16)

$aes = [System.Security.Cryptography.AesGcm]::new($keyBytes, 16)
$aes.Encrypt($nonce, $plainBytes, $cipherBytes, $tag)

# Pack: nonce (12) + tag (16) + ciphertext (rest)
$combined = [byte[]]::new($nonce.Length + $tag.Length + $cipherBytes.Length)
[Buffer]::BlockCopy($nonce, 0, $combined, 0, $nonce.Length)
[Buffer]::BlockCopy($tag, 0, $combined, $nonce.Length, $tag.Length)
[Buffer]::BlockCopy($cipherBytes, 0, $combined, $nonce.Length + $tag.Length, $cipherBytes.Length)

$ciphertextBase64 = [System.Convert]::ToBase64String($combined)

# --- Output ---
if ($OutFile) {
    $ciphertextBase64 | Out-File -FilePath $OutFile -Encoding ascii -NoNewline
    Write-Host "Ciphertext written to: $OutFile" -ForegroundColor Green
} else {
    Write-Host "CIPHERTEXT (send this to the Pi):" -ForegroundColor Green
    Write-Host $ciphertextBase64 -ForegroundColor White
}

Write-Host ""
Write-Host "Delete password from clipboard and terminal history after done." -ForegroundColor Red
Write-Host ""
