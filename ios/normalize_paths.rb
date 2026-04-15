require 'xcodeproj'

project_path = 'SHareIt.xcodeproj'
project = Xcodeproj::Project.open(project_path)

# 1. Locate the main app group
main_group = project.main_group.find_subpath('SHareIt', false)
if main_group
  puts "Group 'SHareIt' found. Current path: '#{main_group.path}'"
  
  # Ensure the group itself is mapped to the 'SHareIt' folder on disk
  main_group.path = 'SHareIt'
  main_group.set_source_tree('<group>')

  # 2. Fix paths for all files within the group to be relative to the group's 'SHareIt' path
  main_group.files.each do |file|
    # If the file path already includes 'SHareIt/', it's potentially double-pathed if the group also has 'SHareIt'
    # The correct setup is: Group path = 'SHareIt', File path = 'filename'
    if file.path.include?('/')
      file.path = file.path.split('/').last
    end
    file.set_source_tree('<group>')
    puts "Normalized path for: #{file.display_name} -> #{file.path}"
  end
else
  puts "Group 'SHareIt' not found!"
end

project.save
puts "Project path normalization successful."
