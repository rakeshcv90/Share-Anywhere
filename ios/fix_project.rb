require 'xcodeproj'

project_path = 'SHareIt.xcodeproj'
project = Xcodeproj::Project.open(project_path)

# 1. Fix Native Target for ShareExtension
target = project.targets.find { |t| t.name == 'ShareExtension' }
if target
  puts "Found ShareExtension target. Fixing names..."
  target.product_name = 'ShareExtension'
  
  # Ensure the product reference has a proper filename
  if target.product_reference
    target.product_reference.path = 'ShareExtension.appex'
    target.product_reference.name = 'ShareExtension.appex'
  end

  # 2. Fix Build Configurations
  target.build_configurations.each do |config|
    config.build_settings['PRODUCT_NAME'] = 'ShareExtension'
    config.build_settings['PRODUCT_BUNDLE_IDENTIFIER'] = 'com.shareanywhere.app.ShareExtension'
    config.build_settings['SKIP_INSTALL'] = 'YES'
    config.build_settings['INFOPLIST_FILE'] = 'ShareExtension/Info.plist'
    config.build_settings['CODE_SIGN_ENTITLEMENTS'] = 'ShareExtension/ShareExtension.entitlements'
    config.build_settings['APPLICATION_EXTENSION_API_ONLY'] = 'YES'
  end
else
  puts "ShareExtension target not found!"
end

# 3. Fix Main Target Build Phases (Ensure exactly ONE entry in Embed App Extensions)
main_target = project.targets.find { |t| t.name == 'SHareIt' }
if main_target && target
  puts "Updating SHareIt target build phases..."
  
  copy_phase = main_target.copy_files_build_phases.find { |p| p.name == 'Embed App Extensions' }
  if copy_phase
    # Clean up any existing duplicates or malformed entries
    copy_phase.files.each do |build_file|
      if build_file.file_ref && (build_file.file_ref.name == 'ShareExtension.appex' || build_file.file_ref.path == '.appex' || build_file.file_ref == target.product_reference)
        build_file.remove_from_project
      end
    end
    # Add the correct reference exactly once
    copy_phase.add_file_reference(target.product_reference)
  end
end

project.save
puts "Project fix applied successfully."
