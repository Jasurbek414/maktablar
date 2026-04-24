$token = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJzdXBlcmFkbWluIiwicm9sZSI6IlNVUEVSQURNSU4iLCJ1c2VySWQiOjEsImlhdCI6MTc3NzA0MDgyMSwiZXhwIjoxNzc3MTI3MjIxfQ.e5-Zv6hRBF2l1NqzmrtkQ99X9sO3GTW09pwU6-v48wo"
$headers = @{ "Authorization" = "Bearer $token"; "Content-Type" = "application/json" }

$students135 = @(
  @{fullName="Karimov Jasur"; faceId="F135001"; schoolId=2; photoUrl="https://picsum.photos/seed/s1/200"},
  @{fullName="Rahimova Dilnoza"; faceId="F135002"; schoolId=2; photoUrl="https://picsum.photos/seed/s2/200"},
  @{fullName="Abdullayev Sherzod"; faceId="F135003"; schoolId=2; photoUrl="https://picsum.photos/seed/s3/200"},
  @{fullName="Toshmatova Gulnora"; faceId="F135004"; schoolId=2; photoUrl="https://picsum.photos/seed/s4/200"},
  @{fullName="Xolmatov Bekzod"; faceId="F135005"; schoolId=2; photoUrl="https://picsum.photos/seed/s5/200"},
  @{fullName="Nazarova Madina"; faceId="F135006"; schoolId=2; photoUrl="https://picsum.photos/seed/s6/200"},
  @{fullName="Mirzayev Sardor"; faceId="F135007"; schoolId=2; photoUrl="https://picsum.photos/seed/s7/200"},
  @{fullName="Yuldasheva Zulfiya"; faceId="F135008"; schoolId=2; photoUrl="https://picsum.photos/seed/s8/200"},
  @{fullName="Ergashev Otabek"; faceId="F135009"; schoolId=2; photoUrl="https://picsum.photos/seed/s9/200"},
  @{fullName="Turgunova Shahlo"; faceId="F135010"; schoolId=2; photoUrl="https://picsum.photos/seed/s10/200"},
  @{fullName="Qodirov Javlon"; faceId="F135011"; schoolId=2; photoUrl="https://picsum.photos/seed/s11/200"},
  @{fullName="Ismoilova Nargiza"; faceId="F135012"; schoolId=2; photoUrl="https://picsum.photos/seed/s12/200"},
  @{fullName="Sobirov Ulugbek"; faceId="F135013"; schoolId=2; photoUrl="https://picsum.photos/seed/s13/200"},
  @{fullName="Azimova Feruza"; faceId="F135014"; schoolId=2; photoUrl="https://picsum.photos/seed/s14/200"},
  @{fullName="Jurayev Dostonbek"; faceId="F135015"; schoolId=2; photoUrl="https://picsum.photos/seed/s15/200"},
  @{fullName="Raxmatullayeva Mohira"; faceId="F135016"; schoolId=2; photoUrl="https://picsum.photos/seed/s16/200"},
  @{fullName="Tursunov Nodir"; faceId="F135017"; schoolId=2; photoUrl="https://picsum.photos/seed/s17/200"},
  @{fullName="Botirov Farrux"; faceId="F135018"; schoolId=2; photoUrl="https://picsum.photos/seed/s18/200"},
  @{fullName="Umarova Kamola"; faceId="F135019"; schoolId=2; photoUrl="https://picsum.photos/seed/s19/200"},
  @{fullName="Hasanov Asilbek"; faceId="F135020"; schoolId=2; photoUrl="https://picsum.photos/seed/s20/200"}
)

$students210 = @(
  @{fullName="Rustamov Eldor"; faceId="F210001"; schoolId=3; photoUrl="https://picsum.photos/seed/s21/200"},
  @{fullName="Sultonova Zilola"; faceId="F210002"; schoolId=3; photoUrl="https://picsum.photos/seed/s22/200"},
  @{fullName="Normatov Bobur"; faceId="F210003"; schoolId=3; photoUrl="https://picsum.photos/seed/s23/200"},
  @{fullName="Xasanova Sevinch"; faceId="F210004"; schoolId=3; photoUrl="https://picsum.photos/seed/s24/200"},
  @{fullName="Aliyev Doniyor"; faceId="F210005"; schoolId=3; photoUrl="https://picsum.photos/seed/s25/200"},
  @{fullName="Ibragimova Laylo"; faceId="F210006"; schoolId=3; photoUrl="https://picsum.photos/seed/s26/200"},
  @{fullName="Mamatov Jahongir"; faceId="F210007"; schoolId=3; photoUrl="https://picsum.photos/seed/s27/200"},
  @{fullName="Qurbonova Barno"; faceId="F210008"; schoolId=3; photoUrl="https://picsum.photos/seed/s28/200"},
  @{fullName="Uzoqov Sanjar"; faceId="F210009"; schoolId=3; photoUrl="https://picsum.photos/seed/s29/200"},
  @{fullName="Xamrayeva Nigora"; faceId="F210010"; schoolId=3; photoUrl="https://picsum.photos/seed/s30/200"},
  @{fullName="Olimov Ravshan"; faceId="F210011"; schoolId=3; photoUrl="https://picsum.photos/seed/s31/200"},
  @{fullName="Saidova Dilfuza"; faceId="F210012"; schoolId=3; photoUrl="https://picsum.photos/seed/s32/200"},
  @{fullName="To'rayev Islom"; faceId="F210013"; schoolId=3; photoUrl="https://picsum.photos/seed/s33/200"},
  @{fullName="Ergashova Munira"; faceId="F210014"; schoolId=3; photoUrl="https://picsum.photos/seed/s34/200"},
  @{fullName="Kamolov Husan"; faceId="F210015"; schoolId=3; photoUrl="https://picsum.photos/seed/s35/200"},
  @{fullName="Raximova Sarvinoz"; faceId="F210016"; schoolId=3; photoUrl="https://picsum.photos/seed/s36/200"},
  @{fullName="Salimov Mirzo"; faceId="F210017"; schoolId=3; photoUrl="https://picsum.photos/seed/s37/200"},
  @{fullName="Akbarova Hilola"; faceId="F210018"; schoolId=3; photoUrl="https://picsum.photos/seed/s38/200"},
  @{fullName="Xudoyberdiyev Laziz"; faceId="F210019"; schoolId=3; photoUrl="https://picsum.photos/seed/s39/200"},
  @{fullName="Murodova Oydin"; faceId="F210020"; schoolId=3; photoUrl="https://picsum.photos/seed/s40/200"}
)

$all = $students135 + $students210
$ok = 0; $fail = 0
foreach ($s in $all) {
  $body = $s | ConvertTo-Json
  try {
    $r = Invoke-RestMethod -Uri "https://maktab.ecos.uz/api/students" -Method POST -Headers $headers -Body $body
    $ok++
    Write-Host "OK: $($s.fullName) -> ID $($r.id)"
  } catch {
    $fail++
    Write-Host "FAIL: $($s.fullName) - $($_.Exception.Message)"
  }
}
Write-Host "`nTotal: $ok OK, $fail FAIL"
