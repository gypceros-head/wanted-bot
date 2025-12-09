namespace :parts do
  desc "Import SVG parts from a directory structure into the parts table"
  task import: :environment do
    # 環境変数で指定可能
    # BASE_DIR: どのフォルダを起点とするか（app/assets/images/parts想定）
    # OVERWRITE: 既存レコードを上書きするか（true/false）
    # DRY_RUN: 実際には保存せずログだけ出す（true/false）
    base_dir   = ENV["BASE_DIR"] || "app/assets/images/parts"
    overwrite  = ActiveModel::Type::Boolean.new.cast(ENV["OVERWRITE"])
    dry_run    = ActiveModel::Type::Boolean.new.cast(ENV["DRY_RUN"])

    root_path = Rails.root.join(base_dir)

    unless Dir.exist?(root_path)
      puts "[ERROR] BASE_DIR=#{base_dir} が存在しません (#{root_path})"
      exit 1
    end

    puts "[INFO] Import Parts from: #{root_path}"
    puts "[INFO] OVERWRITE=#{overwrite}, DRY_RUN=#{dry_run}"

    # 例: app/assets/images/parts/**/**/*.svg
    pattern = File.join(root_path, "**", "*.svg")
    files = Dir.glob(pattern)

    if files.empty?
      puts "[WARN] SVG ファイルが見つかりません: #{pattern}"
      next
    end

    # Part の tone enum を利用
    # 例: enum default_tone_code: { neutral: 0, primary: 1, dark: 2, ... }
    tone_keys = Part.default_tone_codes.keys.map(&:to_s)

    created_count = 0
    updated_count = 0
    skipped_count = 0

    files.sort.each do |full_path|
      # full_path例: /app/.../app/assets/images/parts/eye/RoundEye01_neutral.svg
      rel_path   = Pathname.new(full_path).relative_path_from(Rails.root.join("app/assets/images")).to_s
      # rel_path例: "parts/eye/RoundEye01_neutral.svg"

      # category は "parts/<category>/..." の <category> を使う
      # 例: "parts/eye/RoundEye01_neutral.svg" → "eye"
      parts = rel_path.split(File::SEPARATOR)
      # ["parts", "eye", "RoundEye01_neutral.svg"]
      if parts.size < 3
        puts "[WARN] パス形式が不正のためスキップ: #{rel_path}"
        skipped_count += 1
        next
      end

      category = parts[1] # "eye" など
      filename = parts.last # "RoundEye01_neutral.svg"
      basename = File.basename(filename, ".svg") # "RoundEye01_neutral"

      # basename を "表示名" と "tone_code" に分解
      # 例: "RoundEye01_neutral" → name_str="RoundEye01", tone_str="neutral"
      name_str, sep, tone_str = basename.rpartition("_")

      if sep.empty?
        # "_" が含まれなかった場合、すべて name、tone は neutral
        name_str = basename
        tone_str = "neutral"
      end

      tone_str = tone_str.to_s.downcase
      tone_key =
        if tone_keys.include?(tone_str)
          tone_str
        else
          # 例外処理: 解釈できなければ neutral
          "neutral"
        end

      # DB 上の name はそのまま basename を使うか、日本語名などに変換してもよい
      # ここではファイルベースの "RoundEye01" をそのまま name として利用
      part_name = name_str

      # ここでは asset_path は "parts/eye/xxx.svg" という相対パスで保存
      asset_path = rel_path

      part = Part.find_by(asset_path: asset_path)

      if part.nil?
        part = Part.new(
          asset_path: asset_path,
          category: category,
          name: part_name,
          default_tone_code: tone_key
        )

        if dry_run
          puts "[DRY_RUN][CREATE] #{asset_path} category=#{category} name=#{part_name} tone=#{tone_key}"
        else
          if part.save
            created_count += 1
            puts "[CREATE] #{asset_path} category=#{category} name=#{part_name} tone=#{tone_key}"
          else
            skipped_count += 1
            puts "[ERROR][CREATE] #{asset_path} 保存失敗: #{part.errors.full_messages.join(", ")}"
          end
        end
      else
        # 既存レコードがある場合
        if overwrite
          part.category          = category
          part.name              = part_name
          part.default_tone_code = tone_key

          if dry_run
            puts "[DRY_RUN][UPDATE] #{asset_path} category=#{category} name=#{part_name} tone=#{tone_key}"
          else
            if part.save
              updated_count += 1
              puts "[UPDATE] #{asset_path} category=#{category} name=#{part_name} tone=#{tone_key}"
            else
              skipped_count += 1
              puts "[ERROR][UPDATE] #{asset_path} 更新失敗: #{part.errors.full_messages.join(", ")}"
            end
          end
        else
          # 上書きしない場合はスキップ
          skipped_count += 1
          puts "[SKIP] #{asset_path} (既存レコードあり / OVERWRITE=false)"
        end
      end
    end

    puts "=== Import summary ==="
    puts "  created: #{created_count}"
    puts "  updated: #{updated_count}"
    puts "  skipped: #{skipped_count}"
  end
end
