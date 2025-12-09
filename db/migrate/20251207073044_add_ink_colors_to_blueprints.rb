class AddInkColorsToBlueprints < ActiveRecord::Migration[7.2]
  def change
    add_column :blueprints, :light_ink_color, :string, null: false, default: "#cc3333"
    add_column :blueprints, :dark_ink_color,  :string, null: false, default: "#222222"
    add_column :blueprints, :paper_color,     :string, null: false, default: "#f8f0d8"
  end
end