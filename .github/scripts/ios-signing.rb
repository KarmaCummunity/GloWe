# Creates an App Store distribution cert + profile via the ASC API key (runner only).
require 'spaceship'
require 'openssl'
require 'base64'
out = ARGV[0]
Spaceship::ConnectAPI.token = Spaceship::ConnectAPI::Token.create(
  key_id: ENV.fetch('EXPO_ASC_KEY_ID'), issuer_id: ENV.fetch('EXPO_ASC_ISSUER_ID'),
  filepath: ENV.fetch('EXPO_ASC_API_KEY_PATH'))
ident = ENV.fetch('BUNDLE_ID')
bid = Spaceship::ConnectAPI::BundleId.find(ident) ||
      Spaceship::ConnectAPI::BundleId.create(name: 'KC', identifier: ident, platform: 'IOS')
existing = (bid.get_capabilities rescue []).map(&:capability_type)
puts "existing capabilities: #{existing.join(',')}"
{ 'APPLE_ID_AUTH' => [{ key: 'APPLE_ID_AUTH_APP_CONSENT', options: [{ key: 'PRIMARY_APP_CONSENT' }] }],
  'ASSOCIATED_DOMAINS' => [], 'PUSH_NOTIFICATIONS' => [] }.each do |cap, settings|
  next puts("capability #{cap}: already on") if existing.include?(cap)
  begin
    bid.create_capability(cap, settings: settings)
    puts "capability #{cap}: enabled"
  rescue => e
    abort "capability #{cap} failed: #{e.class}: #{e.message[0, 300]}"
  end
end
# Revoke certs created by earlier runs of this temp workflow (ours only).
%w[4WNVZH34G5 46JN967P5J].each do |cid|
  begin
    Spaceship::ConnectAPI.delete_certificate(certificate_id: cid); puts "revoked #{cid}"
  rescue => e
    puts "revoke #{cid}: #{e.message[0, 120]}"
  end
end
key = OpenSSL::PKey::RSA.new(2048)
csr = OpenSSL::X509::Request.new
csr.version = 0
csr.subject = OpenSSL::X509::Name.parse('/CN=KC Distribution/O=Karma Community/C=IL')
csr.public_key = key.public_key
csr.sign(key, OpenSSL::Digest::SHA256.new)
cert = Spaceship::ConnectAPI::Certificate.create(certificate_type: 'DISTRIBUTION', csr_content: csr.to_pem)
puts "certificate created: #{cert.id}"
File.write(File.join(out, 'key.pem'), key.to_pem)
File.binwrite(File.join(out, 'cert.der'), Base64.decode64(cert.certificate_content))
prof = Spaceship::ConnectAPI::Profile.create(name: "KC AppStore #{Time.now.to_i}",
  profile_type: 'IOS_APP_STORE', bundle_id_id: bid.id, certificate_ids: [cert.id])
puts "profile created: #{prof.id}"
File.binwrite(File.join(out, 'kc.mobileprovision'), Base64.decode64(prof.profile_content))
