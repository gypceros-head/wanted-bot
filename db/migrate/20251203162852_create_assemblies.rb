class CreateAssemblies < ActiveRecord::Migration[7.2]
  def change
    create_table :assemblies do |t|
      t.references :blueprint, null: false, foreign_key: true
      t.references :part, null: false, foreign_key: true
      t.integer :layer_order, null: false
      t.float :position_x, null: false
      t.float :position_y, null: false
      t.float :scale_x, null: false
      t.float :scale_y, null: false
      t.float :rotation_deg, null: false

      t.timestamps
    end
  end
end
