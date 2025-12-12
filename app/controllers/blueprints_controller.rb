class BlueprintsController < ApplicationController
  before_action :set_blueprint, only: %i[show edit update preview_image]
  before_action :set_parts,     only: %i[new edit create update]

  # TODO: 認証が整ったら authenticate_user! もここに入れる
  # before_action :authenticate_user!

  def new
    @blueprint = Blueprint.new(
      name: "新しい手配書",
      editor_state: default_editor_state
    )
    # 将来 post と紐づけるならここで post_id もセットする
  end

  def create
    @blueprint = Blueprint.new(blueprint_params)
    assign_editor_state_from_param(@blueprint)

    if @blueprint.save
      attach_preview_image_from_param(@blueprint)
      @blueprint.sync_assemblies_from_editor_state!
      redirect_to edit_blueprint_path(@blueprint), notice: "設計図を作成しました"
    else
      render :new, status: :unprocessable_entity
    end
  end

  def show
  end

  def edit
    # @blueprint は set_blueprint で取得済み
  end

  def update
    @blueprint.assign_attributes(blueprint_params)
    assign_editor_state_from_param(@blueprint)

    if @blueprint.save
      attach_preview_image_from_param(@blueprint)
      @blueprint.sync_assemblies_from_editor_state!
      redirect_to @blueprint, notice: "設計図を更新しました"
    else
      render :edit, status: :unprocessable_entity
    end
  end

  # PNG を ActiveStorage に添付する（MVP: Blueprint 側に保存）
  # 期待するparams: params[:image] (multipart/form-data)
  def preview_image
    image = params[:image]

    unless image.respond_to?(:content_type)
      return render json: { error: "image is required" }, status: :unprocessable_entity
    end

    unless image.content_type == "image/png"
      return render json: { error: "image must be PNG" }, status: :unprocessable_entity
    end

    # Blueprint モデル側に `has_one_attached :preview_image` を追加している想定
    @blueprint.preview_image.attach(
      image,
      filename: "blueprint-#{@blueprint.id}.png",
      content_type: "image/png"
    )

    if @blueprint.preview_image.attached?
      render json: { ok: true }, status: :ok
    else
      render json: { error: "attach failed" }, status: :unprocessable_entity
    end
  end

  private

  def set_blueprint
    @blueprint = Blueprint.find(params[:id])
  end

  def set_parts
    # Part をカテゴリ順・名前順で並べつつ、カテゴリごとにグループ化
    @parts_by_category = Part.order(:category, :name).group_by(&:category)
    # 例: { "eye" => [#<Part ...>, ...], "mouth" => [...], ... }
  end

  # editor_state は hidden_field から JSON 文字列で飛んでくる想定なので、
  # いったん permit しつつ、別メソッドで JSON.parse。
  def blueprint_params
    params.require(:blueprint).permit(
      :name,
      :post_id,
      :light_ink_color,
      :dark_ink_color,
      :paper_color,
      :editor_state # ここには “文字列” が入ってくる想定
    )
  end

  # JSON 文字列 → Hash に変換して jsonb に保存
  def assign_editor_state_from_param(blueprint)
    raw = blueprint.editor_state
    return if raw.blank? || raw.is_a?(Hash)

    begin
      blueprint.editor_state = JSON.parse(raw)
    rescue JSON::ParserError => e
      Rails.logger.warn("[BlueprintsController] editor_state JSON parse error: #{e.message}")
      blueprint.editor_state = {}
    end
  end


  # 新規作成時のデフォルト状態（空のキャンバス）
  def default_editor_state
    {
      "version" => "5.3.0", # Fabric.js のバージョンに合わせておく
      "objects" => []
    }
  end

  def attach_preview_image_from_param(blueprint)
    data_url = params.dig(:blueprint, :preview_image_data)
    return if data_url.blank?

    # 形式: data:image/png;base64,....
    unless data_url.start_with?("data:image/png;base64,")
      Rails.logger.warn("[BlueprintsController] preview_image_data is not png dataURL")
      return
    end

    base64 = data_url.split(",", 2)[1]
    return if base64.blank?

    decoded = Base64.decode64(base64)
    io = StringIO.new(decoded)

    blueprint.preview_image.purge if blueprint.preview_image.attached?
    blueprint.preview_image.attach(
      io: io,
      filename: "blueprint-#{blueprint.id}.png",
      content_type: "image/png"
    )
  rescue ArgumentError => e
    Rails.logger.warn("[BlueprintsController] preview_image_data decode failed: #{e.message}")
  end
end
