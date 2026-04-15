require 'xcodeproj'

project_path = 'SHareIt.xcodeproj'
project = Xcodeproj::Project.open(project_path)

# 1. Find the main group (SHareIt)
main_group = project.main_group.find_subpath('SHareIt', false)
if main_group
  puts "Found SHareIt group. Current path: #{main_group.path}"
  
  # Normalize group path
  main_group.set_source_tree('<group>')
  # The SHareIt group is usually relative to the project root (the 'ios' directory)
  # but sometimes it is the root group itself.
  
  # Fix specific files in the group
  files_to_fix = [
    { name: 'SHareIt.entitlements', correct_path: 'SHareIt.entitlements' },
    { name: 'TurboTransferModule.swift', correct_path: 'TurboTransferModule.swift' },
    { name: 'TurboTransferModule.m', correct_path: 'TurboTransferModule.m' }
  ]

  files_to_fix.each do |f|
    # Find any file that looks like this, even if it is named wrong
    found_file = main_group.files.find { |file| (file.name || file.path).include?(f[:name].split('.').first) }
    
    if found_file
      puts "Updating existing reference: #{found_file.name || found_file.path}"
      found_file.set_source_tree('<group>')
      found_file.path = f[:correct_path]
      found_file.name = f[:name]
    else
      puts "Adding missing reference: #{f[:name]}"
      main_group.new_file(f[:correct_path])
    end
  end
  
  # Clean up duplicate or malformed references
  main_group.files.each do |file|
    if (file.name == 'SHareIt' && file.path == 'SHareIt') || (file.name == nil && file.path == 'TurboTransferModule')
      puts "Removing bad reference: #{file.name || file.path}"
      file.remove_from_project
    end
  end
else
  puts "SHareIt group not found!"
end

project.save
puts "Project navigator fix applied."
