module ApplicationHelper
  def flash_classes(key)
    case key.to_sym
    when :notice
      "bg-emerald-50 border-emerald-500 text-emerald-800"
    when :alert
      "bg-red-50 border-red-500 text-red-800"
    else
      "bg-slate-50 border-slate-500 text-slate-800"
    end
  end
end
