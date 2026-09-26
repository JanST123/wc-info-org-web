<?php
$ch = curl_init('https://api.wc-info.org/sitemap');
curl_setopt_array($ch, [
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_HEADER => true
]);
$res = curl_exec($ch);
curl_close($ch);


list($headers, $body) = explode("\r\n\r\n", $res);

$headerLines = explode("\n", $headers);
foreach ($headerLines as $headerLine) {
  header($headerLine);
}
echo $body;