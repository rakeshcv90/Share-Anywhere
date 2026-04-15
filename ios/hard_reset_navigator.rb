require 'xcodeproj'

project_path = 'SHareIt.xcodeproj'
project = Xcodeproj::Project.open(project_path)

# 1. Purge problematic references
main_group = project.main_group.find_subpath('SHareIt', false)
if main_group
  puts "Purging old references in SHareIt group..."
  main_group.files.each do |file|
    name = file.name || file.path
    if name.include?('TurboTransferModule') || name.include?('SHareIt.entitlements') || name == 'SHareIt'
      puts "Removing: #{name}"
      file.remove_from_project
    end
  end

  # 2. Add fresh references with explicit relative paths
  # Note: main_group.path is usually 'SHareIt', so files should be added with their basename
  puts "Adding fresh references..."
  file_ent = main_group.new_file('SHareIt.entitlements')
  file_swift = main_group.new_file('TurboTransferModule.swift')
  file_m = main_group.new_file('TurboTransferModule.m')

  # 3. Re-link to Build Phases (Main Target)
  main_target = project.targets.find { |t| t.name == 'SHareIt' }
  if main_target
    puts "Re-linking to SHareIt build phases..."
    # Ensure no duplicates in Sources
    main_target.source_build_phase.files.each do |bf|
      if bf.file_ref && bf.file_ref.path.include?('TurboTransferModule')
        bf.remove_from_project
      end
    end
    main_target.add_file_references([file_swift, file_m])
    
    # Update build settings
    main_target.build_configurations.each do |config|
      config.build_settings['CODE_SIGN_ENTITLEMENTS'] = 'SHareIt/SHareIt.entitlements'
    end
  end
end

project.save
puts "Hard reset of project navigator successful."
