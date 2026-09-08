package com.kizuna.security;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.Collections;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FirebaseUserPrincipal implements UserDetails {

    private String uid;
    private String email;
    private String name;
    private String picture;
    private String role; // e.g. "ROLE_USER" or "ROLE_ADMIN"

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        String assignedRole = (role != null && !role.isEmpty()) ? role : "ROLE_USER";
        return List.of(new SimpleGrantedAuthority(assignedRole));
    }

    @Override
    public String getPassword() {
        return null; // Firebase handles password authentication on client
    }

    @Override
    public String getUsername() {
        return uid;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return true;
    }
}
