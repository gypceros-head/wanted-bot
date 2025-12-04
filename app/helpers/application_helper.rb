module ApplicationHelper
  def flash_css_class(key)
    case key.to_sym
    when :notice
      "bg-emerald-500 text-white"
    when :alert
      "bg-red-500 text-white"
    else
      "bg-slate-700 text-white"
    end
  end
end
