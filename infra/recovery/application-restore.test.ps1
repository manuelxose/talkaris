param([Parameter(Mandatory = $true)][string]$AppImage, [Parameter(Mandatory = $true)][string]$SnapshotManifest)
$ErrorActionPreference = 'Stop'
$runId = (New-Guid).Guid -replace '-', ''
$app = "talkaris-recovery-$runId-app"
$sourceDb = "talkaris-recovery-$runId-source"
$restoreDb = "talkaris-recovery-$runId-restored"
$dumpPath = Join-Path $env:TEMP "talkaris-recovery-$runId.dump"
$dbImage = 'pgvector/pgvector@sha256:7b822b0aac60967beb1ea5e576b8602c94c300a157d187f385ae3e0da199b90a'
$testFile = Join-Path $PSScriptRoot 'application.test.mjs'
$expectedImage = 'sha256:fd9219e964667cbd06acb814f64bb8230f97654c6dd0367b9e39819bad61881f'
$expectedSnapshot = '43b2fc0d6d7cd979105f6d6d0bb174d87ddb782c5a3efbe974f31be5fb52814a'

function Invoke-Docker([string[]]$DockerArgs) {
  & docker @DockerArgs
  if ($LASTEXITCODE -ne 0) { throw "Docker failed: $($DockerArgs[0])" }
}
function Wait-Database([string]$Name, [string]$Port) {
  for ($i = 0; $i -lt 60; $i++) {
    & docker exec $Name env -i PATH=/usr/lib/postgresql/16/bin:/usr/bin:/bin pg_isready -h 127.0.0.1 -p $Port -U m0 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) { return }
    Start-Sleep -Seconds 1
  }
  throw 'Synthetic PostgreSQL did not start'
}

try {
  $imageId = & docker image inspect $AppImage --format '{{.Id}}'
  if ($LASTEXITCODE -ne 0 -or $imageId -ne $expectedImage) { throw 'Application image is not the recorded synthetic M0 image' }
  if ((Get-FileHash -Algorithm SHA256 -LiteralPath $SnapshotManifest).Hash -ine $expectedSnapshot) { throw 'Synthetic source snapshot manifest does not match the recorded evidence' }
  $imageEnv = & docker image inspect $AppImage --format '{{range .Config.Env}}{{println .}}{{end}}'
  if ($LASTEXITCODE -ne 0 -or ($imageEnv | Where-Object { $_ -match '^PG[A-Z_]*=' })) { throw 'Application image contains inherited PostgreSQL settings' }
  Invoke-Docker @('image','inspect',$dbImage,'--format','{{.Id}}')
  Invoke-Docker @('create','--pull','never','--name',$app,'--network','none','--entrypoint','sleep',$AppImage,'infinity')
  Invoke-Docker @('start',$app)
  Invoke-Docker @('cp',$SnapshotManifest,"${app}:/tmp/recovery-source.sha256")
  Invoke-Docker @('exec','-w','/work',$app,'sha256sum','--check','--quiet','/tmp/recovery-source.sha256')
  $mode = & docker inspect --format '{{.HostConfig.NetworkMode}}' $app
  if ($LASTEXITCODE -ne 0 -or $mode -ne 'none') { throw 'App container does not have an isolated network namespace' }
  $appId = & docker inspect --format '{{.Id}}' $app
  Invoke-Docker @('create','--pull','never','--name',$sourceDb,'--network',"container:$app",'--tmpfs','/var/lib/postgresql/data','-e','POSTGRES_DB=talkaris_m0','-e','POSTGRES_USER=m0','-e','POSTGRES_PASSWORD=m0-synthetic-only',$dbImage,'-p','45432')
  Invoke-Docker @('start',$sourceDb)
  if ((& docker inspect --format '{{.HostConfig.NetworkMode}}' $sourceDb) -ne "container:$appId") { throw 'Source database is outside the isolated namespace' }
  Wait-Database $sourceDb '45432'
  Invoke-Docker @('exec','-e','NG_BUILD_MAX_WORKERS=1','-e','NG_BUILD_PARALLEL_TS=0','-e','GOMAXPROCS=2','-e','GOMEMLIMIT=128MiB',$app,'npm','run','build')
  $sourceUrl = 'DATABASE_URL=postgresql://m0:m0-synthetic-only@127.0.0.1:45432/talkaris_m0'
  Invoke-Docker @('exec','-e',$sourceUrl,$app,'npm','run','migrate','-w','@tecnoria-chat/chat-api')
  Invoke-Docker @('exec','-e',$sourceUrl,'-e','M0_NAMESPACE_SERVICES=1',$app,'node','--input-type=module','-e',"import {seed} from './scripts/m0/seed.mjs'; await seed();")
  Invoke-Docker @('exec',$sourceDb,'env','-i','PATH=/usr/lib/postgresql/16/bin:/usr/bin:/bin','PGPASSWORD=m0-synthetic-only','pg_dump','-h','127.0.0.1','-p','45432','-U','m0','-Fc','-f','/tmp/synthetic.dump','talkaris_m0')
  $sourceHash = ((& docker exec $sourceDb sha256sum /tmp/synthetic.dump) -split '\s+')[0]
  if ($LASTEXITCODE -ne 0) { throw 'Could not hash the synthetic database dump' }
  $capture = 'mkdir -p /synthetic/uploads/assets/documents /synthetic/config /backup; printf synthetic-restored-upload > /synthetic/uploads/assets/documents/restore.txt; printf synthetic-only-config > /synthetic/config/config.txt; tar -C / -czf /backup/system.tar.gz work synthetic; cd /backup; sha256sum system.tar.gz > SHA256SUMS'
  Invoke-Docker @('exec',$app,'bash','-c',$capture)
  $restoreStarted = Get-Date
  Invoke-Docker @('create','--pull','never','--name',$restoreDb,'--network',"container:$app",'--tmpfs','/var/lib/postgresql/data','-e','POSTGRES_DB=talkaris_restored','-e','POSTGRES_USER=m0','-e','POSTGRES_PASSWORD=m0-synthetic-only',$dbImage,'-p','45433')
  Invoke-Docker @('start',$restoreDb)
  if ((& docker inspect --format '{{.HostConfig.NetworkMode}}' $restoreDb) -ne "container:$appId") { throw 'Restore database is outside the isolated namespace' }
  Wait-Database $restoreDb '45433'
  Invoke-Docker @('cp',"${sourceDb}:/tmp/synthetic.dump",$dumpPath)
  if ((Get-FileHash -Algorithm SHA256 -LiteralPath $dumpPath).Hash -ine $sourceHash) { throw 'Synthetic database dump changed in transit' }
  Invoke-Docker @('cp',$dumpPath,"${restoreDb}:/tmp/synthetic.dump")
  $restoreHash = ((& docker exec $restoreDb sha256sum /tmp/synthetic.dump) -split '\s+')[0]
  if ($LASTEXITCODE -ne 0 -or $restoreHash -ne $sourceHash) { throw 'Restored database dump hash mismatch' }
  Invoke-Docker @('exec',$restoreDb,'env','-i','PATH=/usr/lib/postgresql/16/bin:/usr/bin:/bin','PGPASSWORD=m0-synthetic-only','pg_restore','--exit-on-error','-h','127.0.0.1','-p','45433','-U','m0','-d','talkaris_restored','/tmp/synthetic.dump')
  Invoke-Docker @('exec',$app,'bash','-c','cd /backup && sha256sum -c SHA256SUMS && mkdir -p /restored && tar -C /restored -xzf system.tar.gz')
  $restoredUrl = 'DATABASE_URL=postgresql://m0:m0-synthetic-only@127.0.0.1:45433/talkaris_restored'
  Invoke-Docker @('exec','-d','-w','/restored/work','-e','NODE_ENV=test','-e','PORT=45101','-e',$restoredUrl,'-e','ADMIN_BEARER_TOKEN=m0-fake-admin-token','-e','LEAD_WEBHOOK_SHARED_SECRET=m0-fake-lead-secret','-e','JWT_SECRET=m0-synthetic-jwt-secret-at-least-16','-e','COOKIE_NAME=m0_session','-e','PORTAL_PUBLIC_URL=http://localhost:45103','-e','CHAT_API_UPLOAD_DIR=/restored/synthetic/uploads',$app,'node','apps/chat-api/dist/main.js')
  Invoke-Docker @('exec','-d','-w','/restored/work','-e',$restoredUrl,'-e','FETCH_TIMEOUT_MS=1000',$app,'node','apps/ingest-worker/dist/main.js','--watch')
  Invoke-Docker @('exec','-d','-w','/restored/work','-e','PORT=45102','-e','HOST=127.0.0.1',$app,'node','apps/widget/server.mjs')
  Invoke-Docker @('exec','-d','-w','/restored/work','-e','PORT=45103','-e','API_INTERNAL_URL=http://127.0.0.1:45101','-e','WIDGET_INTERNAL_URL=http://127.0.0.1:45102',$app,'node','apps/portal/dist/portal/server/server.mjs')
  Invoke-Docker @('cp',$testFile,"${app}:/restored/work/application-recovery.test.mjs")
  Invoke-Docker @('exec','-w','/restored/work','-e',$restoredUrl,$app,'node','application-recovery.test.mjs')
  $duration = (Get-Date) - $restoreStarted
  Write-Host ('Synthetic restoration and functional checks: {0:N1} seconds' -f $duration.TotalSeconds)
} finally {
  foreach ($name in @($restoreDb, $sourceDb, $app)) {
    & docker inspect $name *> $null
    if ($LASTEXITCODE -eq 0) { & docker rm -f $name | Out-Null; if ($LASTEXITCODE -ne 0) { Write-Error "Could not remove synthetic container $name" } }
  }
  if (Test-Path -LiteralPath $dumpPath) { Remove-Item -LiteralPath $dumpPath -Force }
}
