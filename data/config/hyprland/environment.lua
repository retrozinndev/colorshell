-- colorshell configuration, please don't modify unless you know what you're doing!

local env = {
    XDG_CONFIG_HOME = os.getenv("HOME") .. "/.config";
    XDG_CACHE_HOME = os.getenv("HOME") .. "/.cache";
    XDG_DATA_HOME = os.getenv("HOME") .. "/.local/share";
    XDG_STATE_HOME = os.getenv("HOME") .. "/.local/state";
};

for name, val in pairs(env) do
    local sys_env = os.getenv(name);
    if sys_env ~= nil and sys_env.format ~= "" then -- set only if unset
        hl.env(name, val);
    end
end
