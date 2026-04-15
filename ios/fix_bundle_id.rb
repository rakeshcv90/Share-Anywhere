require 'xcodeproj'

project_path = 'SHareIt.xcodeproj'
project = Xcodeproj::Project.open(project_path)

# Correct identifiers
main_app_id = 'com.shareit.share.clone.switch'
extension_id = "#{main_app_id}.ShareExtension"

# 1. Update ShareExtension Target Build Settings
target = project.targets.find { |t| t.name == 'ShareExtension' }
if target
  puts "Updating ShareExtension bundle identifier to: #{extension_id}"
  target.build_configurations.each do |config|
    config.build_settings['PRODUCT_BUNDLE_IDENTIFIER'] = extension_id
  end
else
  puts "ShareExtension target not found!"
end

project.save
puts "Project bundle identifiers updated successfully."
