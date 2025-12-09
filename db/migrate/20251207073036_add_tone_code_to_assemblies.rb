class AddToneCodeToAssemblies < ActiveRecord::Migration[7.2]
  def change
    add_column :assemblies, :tone_code, :integer, null: false, default: 2

    add_index :assemblies, :tone_code
  end
end