require 'xcodeproj'

project_path = 'SHareIt.xcodeproj'
project = Xcodeproj::Project.open(project_path)

# 1. Add TurboTransferModule files to Main Target Group
main_group = project.main_group.find_subpath('SHareIt', true)

# Create file references
file_swift = main_group.find_subpath('TurboTransferModule.swift') || main_group.new_file('TurboTransferModule.swift')
file_m = main_group.find_subpath('TurboTransferModule.m') || main_group.new_file('TurboTransferModule.m')
file_ent = main_group.find_subpath('SHareIt.entitlements') || main_group.new_file('SHareIt.entitlements')

# 2. Find Main Target
main_target = project.targets.find { |t| t.name == 'SHareIt' }
if main_target
  puts "Adding files to main target: SHareIt"
  
  # Add to build phases if not already there
  main_target.add_file_references([file_swift, file_m])
  
  # Update build settings for entitlements
  main_target.build_configurations.each do |config|
    config.build_settings['CODE_SIGN_ENTITLEMENTS'] = 'SHareIt/SHareIt.entitlements'
    config.build_settings['SWIFT_VERSION'] = '5.0'
  end
end

project.save
puts "Successfully added TurboTransferModule files to project.pbxproj."
