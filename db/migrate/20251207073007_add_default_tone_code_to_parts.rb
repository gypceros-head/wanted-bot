class AddDefaultToneCodeToParts < ActiveRecord::Migration[7.2]
  def change
    add_column :parts, :default_tone_code, :integer, null: false, default: 2
    # 2 = neutral（白）
  end
end
