$ErrorActionPreference = 'Stop'
$nonce = (New-Guid).Guid -replace '-', ''
$name = "talkaris-release-check-$nonce"
$image = 'node:22.23.2-bookworm@sha256:dd5847a04b0deee391fa145f1f4c6d214196668b6bcc7988ebed67249f226844'
$files = @('test-container-guard.sh', 'prepare-release.test.sh', 'check-release-processes.test.sh', 'prepare-release.sh', 'release-manifest.mjs', 'verify-release-attestation.sh', 'seal-release.sh', 'check-release-processes.sh')
function Run-Docker([string[]]$DockerArgs) {
  & docker @DockerArgs
  if ($LASTEXITCODE -ne 0) { throw "Docker failed: $($DockerArgs[0])" }
}
try {
  Run-Docker @('image','inspect',$image,'--format','{{.Id}}')
  Run-Docker @('create','--pull','never','--name',$name,'--network','none','--ipc','private','--cgroupns','private','--cap-drop','ALL','--cap-add','CHOWN','--cap-add','FOWNER','--cap-add','DAC_OVERRIDE','--cap-add','SETUID','--cap-add','SETGID','--security-opt','no-new-privileges','--entrypoint','sleep',$image,'infinity')
  $inspection = & docker inspect --format '{{.HostConfig.NetworkMode}}|{{.HostConfig.Privileged}}|{{.HostConfig.PidMode}}|{{.HostConfig.IpcMode}}|{{.HostConfig.UTSMode}}|{{.HostConfig.CgroupnsMode}}|{{len .Mounts}}|{{len .HostConfig.Binds}}|{{len .HostConfig.VolumesFrom}}' $name
  if ($LASTEXITCODE -ne 0) { throw 'Cannot inspect test container' }
  $parts = $inspection -split '\|'
  if ($parts.Count -ne 9 -or $parts[0] -ne 'none' -or $parts[1] -ne 'false' -or $parts[2] -eq 'host' -or $parts[3] -eq 'host' -or $parts[4] -eq 'host' -or $parts[5] -eq 'host' -or $parts[6] -ne '0' -or $parts[7] -ne '0' -or $parts[8] -ne '0') { throw 'Unsafe test-container configuration' }
  Run-Docker @('start',$name)
  Run-Docker @('exec',$name,'mkdir','-p','/test')
  foreach ($file in $files) { Run-Docker @('cp',(Join-Path $PSScriptRoot $file),"${name}:/test/$file") }
  foreach ($test in @('prepare-release.test.sh','check-release-processes.test.sh')) {
    & docker exec $name bash "/test/$test" *> $null
    if ($LASTEXITCODE -eq 0) { throw "Test did not reject an unverified harness: $test" }
  }
  Run-Docker @('exec','-e',"TALKARIS_TEST_NONCE=$nonce",$name,'bash','-c','printf %s "$TALKARIS_TEST_NONCE" > /tmp/talkaris-test-marker')
  Run-Docker @('exec','-e',"TALKARIS_TEST_NONCE=$nonce",$name,'bash','/test/prepare-release.test.sh')
  Run-Docker @('exec','-e',"TALKARIS_TEST_NONCE=$nonce",$name,'bash','/test/check-release-processes.test.sh')
} finally {
  & docker inspect $name *> $null
  if ($LASTEXITCODE -eq 0) {
    & docker rm -f $name | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "Could not remove disposable test container $name" }
  }
}
