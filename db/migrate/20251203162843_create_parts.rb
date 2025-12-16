class CreateParts < ActiveRecord::Migration[7.2]
  def change
    create_table :parts do |t|
      t.string :category, null: false
      t.string :name, null: false
      t.string :asset_path, null: false

      t.timestamps
    end

    add_index :parts, :category
  end
end
