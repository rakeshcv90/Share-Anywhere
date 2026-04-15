require 'xcodeproj'

project_path = 'SHareIt.xcodeproj'
project = Xcodeproj::Project.open(project_path)

# 1. Create ShareExtension Group and add files
extension_group = project.main_group.find_subpath('ShareExtension', true)
extension_group.set_source_tree('<group>')

file_vc = extension_group.new_file('ShareViewController.swift')
file_plist = extension_group.new_file('Info.plist')
file_entitlements = extension_group.new_file('ShareExtension.entitlements')

# 2. Add ShareExtension Target
extension_target = project.targets.find { |t| t.name == 'ShareExtension' } || project.new_target(:app_extension, 'ShareExtension', :ios, '15.1')

# 3. Configure Build Settings for Extension
extension_target.build_configurations.each do |config|
  config.build_settings['PRODUCT_NAME'] = 'ShareExtension'
  config.build_settings['PRODUCT_BUNDLE_IDENTIFIER'] = 'com.shareanywhere.app.ShareExtension'
  config.build_settings['INFOPLIST_FILE'] = 'ShareExtension/Info.plist'
  config.build_settings['CODE_SIGN_ENTITLEMENTS'] = 'ShareExtension/ShareExtension.entitlements'
  config.build_settings['LD_RUNPATH_SEARCH_PATHS'] = '$(inherited) @executable_path/Frameworks @executable_path/../../Frameworks'
  config.build_settings['SKIP_INSTALL'] = 'YES'
  config.build_settings['APPLICATION_EXTENSION_API_ONLY'] = 'YES'
  config.build_settings['SWIFT_VERSION'] = '5.0'
end

# 4. Add Files to Build Phases
extension_target.add_file_references([file_vc])

# Add Info.plist to resources (usually not needed in build phase but for safety)
# project.targets.first.add_resources([file_plist])

# 5. Link Extension to Main Target
main_target = project.targets.find { |t| t.name == 'SHareIt' }
if main_target
  puts "Updating main target: SHareIt"
  
  # Add dependency
  extension_target_dep = main_target.add_dependency(extension_target)
  
  # Add Copy Files phase (Embed App Extensions)
  embed_extensions_phase = main_target.copy_files_build_phases.find { |p| p.name == 'Embed App Extensions' }
  unless embed_extensions_phase
    embed_extensions_phase = main_target.new_copy_files_build_phase('Embed App Extensions')
    embed_extensions_phase.symbol_dst_subfolder_spec = :plug_ins
  end
  embed_extensions_phase.add_file_reference(extension_target.product_reference)

  # Update main target entitlements
  main_target.build_configurations.each do |config|
    config.build_settings['CODE_SIGN_ENTITLEMENTS'] = 'SHareIt/SHareIt.entitlements'
  end
  
  # Add SHareIt.entitlements file reference if it doesn't exist
  main_group = project.main_group.find_subpath('SHareIt', true)
  unless main_group.find_subpath('SHareIt.entitlements')
     main_group.new_file('SHareIt.entitlements')
  end
end

project.save
puts "Successfully modified project.pbxproj via xcodeproj gem."
