require 'xcodeproj'

project_path = 'SHareIt.xcodeproj'
project = Xcodeproj::Project.open(project_path)

# 1. Fix ShareExtension Group Path
extension_group = project.main_group.find_subpath('ShareExtension', false)
if extension_group
  puts "Fixing ShareExtension group path..."
  extension_group.set_source_tree('<group>')
  extension_group.path = 'ShareExtension' # This points to the physical folder SHareIt/ios/ShareExtension/

  # Ensure files in the group are correctly relative
  files_to_check = ['ShareViewController.swift', 'Info.plist', 'ShareExtension.entitlements']
  files_to_check.each do |filename|
    file_ref = extension_group.files.find { |f| (f.name || f.path) == filename }
    if file_ref
      file_ref.path = filename
      file_ref.set_source_tree('<group>')
      puts "Normalized path for: #{filename}"
    end
  end
end

# 2. Fix Build Phases (Remove Duplicates) for ShareExtension target
target = project.targets.find { |t| t.name == 'ShareExtension' }
if target
  puts "Cleaning up build phases for ShareExtension target..."
  sources_phase = target.source_build_phase
  if sources_phase
    # Find all build files in the phase and remove duplicates
    seen_refs = []
    sources_phase.files.each do |build_file|
      if seen_refs.include?(build_file.file_ref.uuid)
        puts "Removing duplicate build file: #{build_file.file_ref.display_name}"
        build_file.remove_from_project
      else
        seen_refs << build_file.file_ref.uuid
      end
    end
  end
end

project.save
puts "Master project path fix applied."
